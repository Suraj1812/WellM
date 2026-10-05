"""Verify the standalone arm64 preview built from this repository."""

import hashlib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)


apk = Path(sys.argv[1]).resolve()
tools = Path(sys.argv[2]) / "build-tools" / "36.0.0"
config = json.loads(Path("app.json").read_text())["expo"]
badging = run(str(tools / "aapt"), "dump", "badging", str(apk))
package = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging)
assert package, "APK package metadata is missing"
assert package.groups() == (
    config["android"]["package"],
    str(config["android"]["versionCode"]),
    config["version"],
), "APK version does not match the source"
assert "sdkVersion:'24'" in badging, "Unexpected minimum Android version"
assert "targetSdkVersion:'36'" in badging, "Unexpected target Android version"
assert "application-debuggable" not in badging, "Release APK must not be debuggable"
assert "native-code: 'arm64-v8a'" in badging, "Unexpected native architecture"
for permission in (
    "android.permission.RECORD_AUDIO",
    "android.permission.FOREGROUND_SERVICE_MICROPHONE",
    "android.permission.WAKE_LOCK",
):
    assert permission in badging, f"Missing permission: {permission}"

manifest = run(str(tools / "aapt"), "dump", "xmltree", str(apk), "AndroidManifest.xml")
assert "SnoreRecordingService" in manifest, "Microphone foreground service is missing"
assert re.search(r"android:allowBackup[^\n]*=\(type 0x12\)0x0", manifest), "Backup must be disabled"

with zipfile.ZipFile(apk) as archive:
    model = archive.read("assets/yamnet.tflite")
    expected_model_hash = "10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de"
    assert hashlib.sha256(model).hexdigest() == expected_model_hash, "Bundled model checksum differs"
    assert archive.getinfo("assets/yamnet.tflite").compress_type == zipfile.ZIP_STORED, "Model must stay uncompressed"
    bundle_bytes = archive.getinfo("assets/index.android.bundle").file_size
    assert bundle_bytes > 500_000, "Embedded application bundle is missing or incomplete"

signature = run(str(tools / "apksigner"), "verify", "--verbose", "--print-certs", str(apk))
certificate = re.search(r"Signer #1 certificate SHA-256 digest: (\w+)", signature)
assert certificate, "Verified signer certificate is missing"
run(str(tools / "zipalign"), "-P", "16", "-c", "4", str(apk))
digest = hashlib.sha256(apk.read_bytes()).hexdigest()
apk.with_suffix(".apk.sha256").write_text(f"{digest}  {apk.name}\n")
report = {
    "package": config["android"]["package"],
    "version": config["version"],
    "versionCode": config["android"]["versionCode"],
    "architecture": "arm64-v8a",
    "bytes": apk.stat().st_size,
    "sha256": digest,
    "signerSha256": certificate.group(1),
    "modelSha256": expected_model_hash,
    "embeddedBundleBytes": bundle_bytes,
    "signatureVerified": True,
    "zipAlignment16KB": True,
}
apk.with_name("apk-verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
