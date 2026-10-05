import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('public/wellm-audio/', root);
const model = new URL('assets/models/yamnet.tflite', root);
const bytes = await readFile(model);
const checksum = createHash('sha256').update(bytes).digest('hex');
if (checksum !== '10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de') {
  throw new Error('The browser model must match the audited, bundled YAMNet model.');
}
await mkdir(output, { recursive: true });
await copyFile(model, new URL('yamnet.tflite', output));
await copyFile(
  new URL('assets/models/YAMNET-LICENSE.txt', root),
  new URL('YAMNET-LICENSE.txt', output),
);
for (const variant of ['internal', 'compat_internal']) {
  for (const extension of ['js', 'wasm']) {
    const name = `litert_wasm_${variant}.${extension}`;
    const source = new URL(`node_modules/@litertjs/core/wasm/${name}`, root);
    const destination = new URL(name, output);
    if (extension === 'wasm') {
      await copyFile(source, destination);
      continue;
    }
    // LiteRT writes every diagnostic to stderr. Metro interprets stderr as an
    // application error. Route only known severities in this local loader;
    // retain genuine errors, package licenses, and the original WASM binary.
    const loader = await readFile(source, 'utf8');
    const initializer = 'var err = console.error.bind(console);';
    if (loader.split(initializer).length !== 2) {
      throw new Error('The pinned LiteRT loader changed; review its scoped stderr adapter.');
    }
    const logger = `var err = (...messages) => {
  const text = messages.map(String).join(' ').trim();
  if (text.startsWith('INFO:') || text === 'WARNING: [npu_registry.cc:34] NPU accelerator could not be loaded and registered: kLiteRtStatusErrorInvalidArgument.') {
    console.info(...messages);
  } else if (text.startsWith('WARNING:')) {
    console.warn(...messages);
  } else {
    console.error(...messages);
  }
};`;
    await writeFile(destination, loader.replace(initializer, logger));
  }
}
console.log(`Prepared local browser YAMNet and LiteRT assets in ${fileURLToPath(output)}`);
