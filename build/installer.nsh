!macro customInstall
  ; Windows caches the previous Electron identity by executable path. Remove
  ; those stale values so the newly branded NovaPlay resources are read.
  WriteRegStr HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${APP_EXECUTABLE_FILENAME}.FriendlyAppName" "NovaPlay"
  WriteRegStr HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${APP_EXECUTABLE_FILENAME}.ApplicationCompany" "NovaPlay"
  WriteRegStr HKCU "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "NovaPlay"
  WriteRegStr HKCU "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\DefaultIcon" "" "$INSTDIR\resources\icon.ico"
  WriteRegStr HKCU "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro customUnInstall
  ; Remove only application registration created by NovaPlay. Electron's
  ; userData directory is intentionally preserved for upgrades/reinstalls.
  DeleteRegKey HKCU "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${APP_EXECUTABLE_FILENAME}.FriendlyAppName"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${APP_EXECUTABLE_FILENAME}.ApplicationCompany"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "NovaPlay"
!macroend
