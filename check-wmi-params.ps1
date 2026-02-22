$class = [wmiclass]'root/WMI:WmiMonitorBrightnessMethods'
$method = $class.Methods['WmiSetBrightness']
Write-Host "WmiSetBrightness Method Parameters:"
Write-Host "===================================="
$method.InParameters.Properties | ForEach-Object {
    Write-Host "Name: $($_.Name), Type: $($_.Type), IsArray: $($_.IsArray)"
}
