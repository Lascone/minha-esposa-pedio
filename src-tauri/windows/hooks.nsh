; Tauri NSIS installer hooks.
; Before uninstalling, put the Windows taskbar back exactly as it was if "Modo dock" left a backup
; behind (for example, after a crash). The app handles --restore-taskbar and exits immediately.
!macro NSIS_HOOK_PREUNINSTALL
  IfFileExists "$INSTDIR\${MAINBINARYNAME}.exe" 0 +2
    ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" --restore-taskbar'
!macroend
