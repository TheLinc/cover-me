using System.Diagnostics;
class P { static int Main(string[] a) {
  var psi = new ProcessStartInfo("node", "\"" + System.Environment.GetEnvironmentVariable("FAKE_CLAUDE_CMD") + "\"");
  psi.UseShellExecute = false;
  var p = Process.Start(psi); p.WaitForExit(); return p.ExitCode; } }
