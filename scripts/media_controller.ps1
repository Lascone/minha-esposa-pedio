param(
    [string]$Action = "status", # "status", "play_pause", "next", "previous", "volume_up", "volume_down", "mute"
    [int]$Volume = -1
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($WinRtAsync, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtAsync))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

try {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $manager = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

    $session = $manager.GetCurrentSession()
    if (-not $session) {
        $sessions = $manager.GetSessions()
        if ($sessions.Count -gt 0) {
            $session = $sessions[0]
        }
    }

    if ($session) {
        switch ($Action) {
            "next" {
                $op = $session.TrySkipNextAsync()
                $null = Await $op ([bool])
            }
            "previous" {
                $op = $session.TrySkipPreviousAsync()
                $null = Await $op ([bool])
            }
            "play_pause" {
                $op = $session.TryTogglePlayPauseAsync()
                $null = Await $op ([bool])
            }
            "play" {
                $op = $session.TryPlayAsync()
                $null = Await $op ([bool])
            }
            "pause" {
                $op = $session.TryPauseAsync()
                $null = Await $op ([bool])
            }
        }

        # Query updated properties
        $propOp = $session.TryGetMediaPropertiesAsync()
        $props = Await $propOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $infoOp = $session.GetPlaybackInfo()

        $statusJson = @{
            has_media = $true
            source_app = $session.SourceAppUserModelId
            title = $props.Title
            artist = $props.Artist
            album_title = $props.AlbumTitle
            playback_status = $infoOp.PlaybackStatus.ToString()
        } | ConvertTo-Json -Compress

        Write-Output $statusJson
    } else {
        # Fallback using simulated multimedia keys (VK_MEDIA_NEXT_TRACK 0xB0, VK_MEDIA_PREV_TRACK 0xB1, VK_MEDIA_PLAY_PAUSE 0xB3)
        if ($Action -ne "status") {
            Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);' -Name 'MediaSim' -Namespace 'PMM' -PassThru | Out-Null
            switch ($Action) {
                "next" { [PMM.MediaSim]::keybd_event(0xB0, 0, 0, [UIntPtr]::Zero); [PMM.MediaSim]::keybd_event(0xB0, 0, 2, [UIntPtr]::Zero) }
                "previous" { [PMM.MediaSim]::keybd_event(0xB1, 0, 0, [UIntPtr]::Zero); [PMM.MediaSim]::keybd_event(0xB1, 0, 2, [UIntPtr]::Zero) }
                "play_pause" { [PMM.MediaSim]::keybd_event(0xB3, 0, 0, [UIntPtr]::Zero); [PMM.MediaSim]::keybd_event(0xB3, 0, 2, [UIntPtr]::Zero) }
            }
        }
        Write-Output '{"has_media":false,"source_app":"","title":"","artist":"","album_title":"","playback_status":"Stopped"}'
    }
} catch {
    # If SMTC is not accessible, fallback cleanly
    Write-Output ('{"has_media":false,"error":"' + $_.Exception.Message.Replace('"', '\"') + '"}')
}
