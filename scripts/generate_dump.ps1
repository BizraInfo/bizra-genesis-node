$excludedDirs = @(
    'node_modules',
    'target',
    'dist',
    'build',
    'coverage',
    '.git',
    '.next',
    '.vs',
    '.idea',
    '.vscode',
    'vendor',
    'tmp',
    'noise_folder',
    'AEGIS-2.0-skeleton',
    'apps\dashboard\src\components\ui'
)

$excludedExtensions = @(
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.class', '.pyc',
    '.map', '.lock', '.log', '.tsbuildinfo', '.tfstate',
    '.profraw', '.profdata',
    '.css', '.scss', '.less',
    '.html',
    '.md',
    '.txt'
)

$excludedFiles = @(
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'Cargo.lock',
    'codebase_structure.txt',
    'codebase_dump.txt',
    'dump_manifest.txt'
)

$includedJsonFiles = @(
    'package.json',
    'tsconfig.json',
    'Cargo.toml',
    'docker-compose.yml'
)

$outputFile = "codebase_dump.txt"
$manifestFile = "dump_manifest.txt"

# Initialize output files
"" | Out-File -Encoding UTF8 $outputFile
"" | Out-File -Encoding UTF8 $manifestFile

Write-Host "Scanning for files..."

$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $pathParts = $_.FullName.Split([System.IO.Path]::DirectorySeparatorChar)
    $isExcludedDir = $false
    foreach ($dir in $excludedDirs) {
        if ($pathParts -contains $dir) {
            $isExcludedDir = $true
            break
        }
    }
    
    $isExcludedExt = $excludedExtensions -contains $_.Extension
    $isExcludedFile = $excludedFiles -contains $_.Name
    
    # Handle JSON files: exclude unless in included list
    if ($_.Extension -eq '.json') {
        if ($includedJsonFiles -contains $_.Name) {
            $isExcludedExt = $false
        }
        else {
            $isExcludedExt = $true
        }
    }

    # Handle test files
    $isTestFile = $_.Name -match '\.spec\.ts$' -or $_.Name -match '\.test\.ts$' -or $_.Name -match '\.test\.tsx$' -or $_.Name -match '\.spec\.tsx$'

    -not $isExcludedDir -and -not $isExcludedExt -and -not $isExcludedFile -and -not $isTestFile
}

Write-Host "Found $($files.Count) files to process."

# Write manifest
$files | ForEach-Object { $_.FullName.Substring($PWD.Path.Length + 1) } | Out-File -Encoding UTF8 $manifestFile

# Process files
$totalSize = 0
$processedCount = 0

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($PWD.Path.Length + 1)
    
    # Skip files larger than 100KB
    if ($file.Length -gt 100 * 1024) {
        Write-Host "Skipping large file: $relativePath ($($file.Length) bytes)"
        continue
    }

    $header = "`n`n================================================================================`n" +
    "FILE: $relativePath`n" +
    "================================================================================`n"
    
    $header | Out-File -Append -Encoding UTF8 $outputFile
    
    try {
        Get-Content -Path $file.FullName -Raw | Out-File -Append -Encoding UTF8 $outputFile
        $processedCount++
    }
    catch {
        Write-Host "Error reading ${relativePath}: $_"
    }
    
    if ($processedCount % 100 -eq 0) {
        Write-Host "Processed $processedCount files..."
    }
}

Write-Host "Done. Generated $outputFile with $processedCount files."
