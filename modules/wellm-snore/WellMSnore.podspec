Pod::Spec.new do |s|
  s.name = 'WellMSnore'
  s.version = '1.0.0'
  s.summary = 'Private native overnight microphone capture and on-device YAMNet inference.'
  s.description = 'Local Expo module for the WellM snoring app. No network or full-night audio storage.'
  s.license = { :type => 'MIT' }
  s.author = 'WellM project contributors'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.source = { :git => '' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'TensorFlowLiteSwift', '2.17.0'
  s.frameworks = 'AVFoundation'
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.resource_bundles = {
    'WellMSnoreModel' => ['ios/Resources/yamnet.tflite']
  }
end
