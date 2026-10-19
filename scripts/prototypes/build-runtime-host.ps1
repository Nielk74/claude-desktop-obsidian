param([string]$OutputName = 'RuntimeHost.exe')
$ErrorActionPreference = 'Stop'
if ($OutputName -notmatch '^RuntimeHost(?:-[a-z0-9]+)?\.exe$') { throw 'Invalid prototype binary name.' }
$prototypeRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\.local\obsidian-native-prototype'))
$sourceFile = Join-Path $PSScriptRoot 'ObsidianRuntimeHost.cs'
$outputFile = Join-Path $prototypeRoot $OutputName
if (Test-Path -LiteralPath $outputFile) { throw 'The prototype host is already built; preserve it while it may be running.' }
$source = Get-Content -LiteralPath $sourceFile -Encoding UTF8 -Raw
Add-Type -TypeDefinition $source -ReferencedAssemblies 'System.Windows.Forms.dll','System.Drawing.dll','System.Web.Extensions.dll' -OutputAssembly $outputFile -OutputType WindowsApplication
Write-Output $outputFile
