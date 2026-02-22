{
  "targets": [
    {
      "target_name": "brightness",
      "sources": [
        "native/brightness.cc",
        "native/win_internal.cpp",
        "native/win_ddc.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "UNICODE",
        "_UNICODE"
      ],
      "conditions": [
        [
          "OS=='win'",
          {
            "libraries": [
              "-lDxva2.lib",
              "-lUser32.lib",
              "-lAdvapi32.lib",
              "-lOle32.lib",
              "-lOleAut32.lib"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1,
                "RuntimeLibrary": 2
              }
            }
          }
        ]
      ]
    }
  ]
}
