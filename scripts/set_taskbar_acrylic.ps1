Add-Type -MemberDefinition '
[DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
[DllImport("user32.dll")] public static extern int SetWindowCompositionAttribute(IntPtr hwnd, ref WindowCompositionAttributeData data);
public enum AccentState { ACCENT_DISABLED = 0, ACCENT_ENABLE_GRADIENT = 1, ACCENT_ENABLE_TRANSPARENTGRADIENT = 2, ACCENT_ENABLE_BLURBEHIND = 3, ACCENT_ENABLE_ACRYLICBLURBEHIND = 4, ACCENT_INVALID_STATE = 5 }
public struct AccentPolicy { public AccentState AccentState; public int AccentFlags; public int GradientColor; public int AnimationId; }
public struct WindowCompositionAttributeData { public int Attribute; public IntPtr Data; public int SizeOfData; }
public static void SetTranslucent(IntPtr hwnd, int accentState, int color) {
    AccentPolicy policy = new AccentPolicy();
    policy.AccentState = (AccentState)accentState;
    policy.AccentFlags = 2;
    policy.GradientColor = color;
    int size = System.Runtime.InteropServices.Marshal.SizeOf(policy);
    IntPtr pPolicy = System.Runtime.InteropServices.Marshal.AllocHGlobal(size);
    System.Runtime.InteropServices.Marshal.StructureToPtr(policy, pPolicy, false);
    WindowCompositionAttributeData data = new WindowCompositionAttributeData();
    data.Attribute = 19; // WCA_ACCENT_POLICY
    data.Data = pPolicy;
    data.SizeOfData = size;
    SetWindowCompositionAttribute(hwnd, ref data);
    System.Runtime.InteropServices.Marshal.FreeHGlobal(pPolicy);
}
' -Name 'DwmTrans' -Namespace 'PMM' -PassThru | Out-Null

$tray = [PMM.DwmTrans]::FindWindow('Shell_TrayWnd', $null)
Write-Output ("Shell_TrayWnd HWND: " + $tray)
if ($tray -ne [IntPtr]::Zero) {
    [PMM.DwmTrans]::SetTranslucent($tray, 4, 0x01000000) # Pure translucent acrylic
    Write-Output "Taskbar acrylic applied successfully!"
}
