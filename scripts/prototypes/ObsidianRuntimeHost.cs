// Throwaway Windows embedding spike. Hosts only the disposable runtime copy.
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class NativeHost {
 [DllImport("user32.dll", SetLastError=true)] internal static extern IntPtr SetParent(IntPtr child, IntPtr parent);
 [DllImport("user32.dll")] internal static extern IntPtr GetParent(IntPtr child);
 [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] internal static extern IntPtr GetStyle(IntPtr hwnd,int index);
 [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW", SetLastError=true)] internal static extern IntPtr SetStyle(IntPtr hwnd,int index,IntPtr value);
 [DllImport("user32.dll", SetLastError=true)] internal static extern bool SetWindowPos(IntPtr hwnd,IntPtr after,int x,int y,int width,int height,uint flags);
 [DllImport("user32.dll")] internal static extern bool ShowWindow(IntPtr hwnd,int command);
 [DllImport("user32.dll")] internal static extern bool IsWindow(IntPtr hwnd);
 [DllImport("user32.dll")] internal static extern bool IsWindowVisible(IntPtr hwnd);
 [DllImport("user32.dll")] internal static extern bool GetClientRect(IntPtr hwnd,out Rect rect);
 [DllImport("user32.dll")] internal static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
 [DllImport("user32.dll")] internal static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
 [DllImport("user32.dll")] internal static extern uint GetDpiForWindow(IntPtr hwnd);
 [DllImport("user32.dll")] internal static extern bool SetProcessDpiAwarenessContext(IntPtr context);
 [DllImport("user32.dll")] internal static extern bool PostMessage(IntPtr hwnd,uint message,IntPtr w,IntPtr l);
 [StructLayout(LayoutKind.Sequential)] internal struct Rect { internal int Left,Top,Right,Bottom; }
 internal static IntPtr ChildStyle(IntPtr style) { return new IntPtr((style.ToInt64() & ~(0x80000000L|0x00C00000L|0x00040000L)) | 0x40000000L); }
}

internal sealed class RuntimeHostForm : Form {
 readonly string root;
 readonly IntPtr guest,externalParent,originalParent,originalStyle,originalExStyle;
 readonly NativeHost.Rect originalRect;
 readonly Panel viewport = new Panel();
 readonly Timer timer = new Timer();
 readonly Button expand = new Button();
 bool attached,docked;

 internal RuntimeHostForm(string rootPath,IntPtr guestHandle,IntPtr parentHandle) {
  root=rootPath;guest=guestHandle;externalParent=parentHandle;
  uint guestPid;NativeHost.GetWindowThreadProcessId(guest,out guestPid);
  string expected=Path.Combine(root,"app","Obsidian.exe");
  if(!String.Equals(Process.GetProcessById((int)guestPid).MainModule.FileName,expected,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("The guest is not this prototype's disposable runtime.");
  if(externalParent!=IntPtr.Zero){
   uint parentPid;NativeHost.GetWindowThreadProcessId(externalParent,out parentPid);
   string parentExe=Process.GetProcessById((int)parentPid).MainModule.FileName;
   if(!parentExe.EndsWith(@"\AnthropicClaude\app-2.42304.2\claude.exe",StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Unexpected Claude parent process.");
  }
  originalParent=NativeHost.GetParent(guest);originalStyle=NativeHost.GetStyle(guest,-16);originalExStyle=NativeHost.GetStyle(guest,-20);NativeHost.GetWindowRect(guest,out originalRect);
  Text="Atelier · Native Obsidian prototype";BackColor=Color.FromArgb(24,24,24);ForeColor=Color.Gainsboro;StartPosition=FormStartPosition.CenterScreen;ClientSize=new Size(1320,820);MinimumSize=new Size(480,420);
  var toolbar=new Panel {Dock=DockStyle.Top,Height=44,BackColor=Color.FromArgb(35,31,42)};
  var label=new Label {Text="◇ Actual Obsidian · disposable demo · prototype",AutoSize=true,Location=new Point(14,14),ForeColor=Color.FromArgb(213,192,246)};
  var close=new Button {Text="Close prototype",Dock=DockStyle.Right,Width=120,FlatStyle=FlatStyle.Flat};close.Click+=(s,e)=>Close();
  expand.Text="Dock";expand.Dock=DockStyle.Right;expand.Width=90;expand.FlatStyle=FlatStyle.Flat;expand.Click+=(s,e)=>{docked=!docked;expand.Text=docked?"Expand":"Dock";PositionHost();};
  toolbar.Controls.Add(label);toolbar.Controls.Add(expand);toolbar.Controls.Add(close);
  viewport.Dock=DockStyle.Fill;viewport.BackColor=Color.FromArgb(30,30,30);Controls.Add(viewport);Controls.Add(toolbar);
  viewport.SizeChanged+=(s,e)=>SizeGuest();
  Shown+=(s,e)=>Attach();FormClosing+=(s,e)=>{File.WriteAllText(Path.Combine(root,"host-exit.txt"),e.CloseReason.ToString());Detach();};
  timer.Interval=250;timer.Tick+=(s,e)=>{if(!NativeHost.IsWindow(guest)||(externalParent!=IntPtr.Zero&&!NativeHost.IsWindow(externalParent))){File.WriteAllText(Path.Combine(root,"host-lifecycle.txt"),"guestExists="+NativeHost.IsWindow(guest)+" parentExists="+NativeHost.IsWindow(externalParent));Close();return;}PositionHost();};
 }

 void Attach(){
  try{
   if(externalParent!=IntPtr.Zero){if((NativeHost.GetStyle(externalParent,-16).ToInt64()&0x20000000L)!=0)NativeHost.ShowWindow(externalParent,9);FormBorderStyle=FormBorderStyle.None;NativeHost.SetStyle(Handle,-16,NativeHost.ChildStyle(NativeHost.GetStyle(Handle,-16)));NativeHost.SetParent(Handle,externalParent);if(NativeHost.GetParent(Handle)!=externalParent)throw new Win32Exception(Marshal.GetLastWin32Error(),"Could not parent the host to Claude.");}
   NativeHost.SetStyle(guest,-16,NativeHost.ChildStyle(originalStyle));NativeHost.SetStyle(guest,-20,new IntPtr(originalExStyle.ToInt64()&~0x00040000L));
   NativeHost.SetParent(guest,viewport.Handle);if(NativeHost.GetParent(guest)!=viewport.Handle)throw new Win32Exception(Marshal.GetLastWin32Error(),"Could not parent the runtime window.");
   attached=true;File.WriteAllText(Path.Combine(root,"allow-visible"),"native host owns the guest");NativeHost.ShowWindow(guest,5);PositionHost();SizeGuest();timer.Start();
  }catch(Exception error){File.WriteAllText(Path.Combine(root,"host-error.txt"),error.ToString());Close();}
 }

 void PositionHost(){
  if(externalParent==IntPtr.Zero){if(docked&&ClientSize.Width!=640)ClientSize=new Size(640,820);else if(!docked&&ClientSize.Width==640)ClientSize=new Size(1320,820);return;}
  if((NativeHost.GetStyle(externalParent,-16).ToInt64()&0x20000000L)!=0)return;
  NativeHost.Rect rect;if(!NativeHost.GetClientRect(externalParent,out rect))return;
  double scale=NativeHost.GetDpiForWindow(externalParent)/96.0;
  int left=(int)(280*scale),top=(int)(44*scale),width=rect.Right-left,height=rect.Bottom-top;
  if(docked){width=Math.Min(width,(int)(560*scale));left=rect.Right-width;}
  NativeHost.SetWindowPos(Handle,IntPtr.Zero,left,top,Math.Max(1,width),Math.Max(1,height),0x0010|0x0040);SizeGuest();
 }

 void SizeGuest(){
  if(!attached||!NativeHost.IsWindow(guest))return;
  int width=Math.Max(1,viewport.ClientSize.Width),height=Math.Max(1,viewport.ClientSize.Height);
  if(!NativeHost.SetWindowPos(guest,IntPtr.Zero,0,0,width,height,0x0004|0x0010|0x0020|0x0040))return;
  var proof=new {prototype=true,hostPid=Process.GetCurrentProcess().Id,guestHandle=guest.ToInt64().ToString(),hostHandle=Handle.ToInt64().ToString(),parentHandle=externalParent.ToInt64().ToString(),guestParentMatched=NativeHost.GetParent(guest)==viewport.Handle,insideClaude=externalParent!=IntPtr.Zero,width=width,height=height,hostDpi=NativeHost.GetDpiForWindow(Handle),guestDpi=NativeHost.GetDpiForWindow(guest),hostVisible=NativeHost.IsWindowVisible(Handle),guestVisible=NativeHost.IsWindowVisible(guest),parentVisible=NativeHost.IsWindowVisible(externalParent),docked=docked};
  File.WriteAllText(Path.Combine(root,"native-host.json"),new JavaScriptSerializer().Serialize(proof));
 }

 void Detach(){
  timer.Stop();
  try{if(File.Exists(Path.Combine(root,"allow-visible")))File.Delete(Path.Combine(root,"allow-visible"));}catch{}
  if(!NativeHost.IsWindow(guest))return;
  NativeHost.SetParent(guest,originalParent);NativeHost.SetStyle(guest,-16,originalStyle);NativeHost.SetStyle(guest,-20,originalExStyle);
  NativeHost.SetWindowPos(guest,IntPtr.Zero,originalRect.Left,originalRect.Top,Math.Max(1,originalRect.Right-originalRect.Left),Math.Max(1,originalRect.Bottom-originalRect.Top),0x0004|0x0010|0x0020);
  NativeHost.ShowWindow(guest,0);NativeHost.PostMessage(guest,0x0010,IntPtr.Zero,IntPtr.Zero);
 }
}

internal static class Program {
 [STAThread] static void Main(string[] args){
  string root=args[0];
  try{NativeHost.SetProcessDpiAwarenessContext(new IntPtr(-4));Application.SetUnhandledExceptionMode(UnhandledExceptionMode.ThrowException);Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new RuntimeHostForm(root,new IntPtr(Int64.Parse(args[1])),args.Length>2?new IntPtr(Int64.Parse(args[2])):IntPtr.Zero));}
  catch(Exception error){File.WriteAllText(Path.Combine(root,"host-error.txt"),error.ToString());}
 }
}
