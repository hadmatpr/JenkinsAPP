pipeline {
    agent any

    environment {
        PROJECT_PATH = "JenkinsAPP\\JenkinsAPP.csproj"
        PUBLISH_FOLDER = "publish"

        TARGET_SERVER = "172.31.0.155"

        IIS_APP_POOL = "JenkinsAPPPool"
        IIS_SITE_NAME = "JenkinsAPP"

        DEPLOY_PATH = "C:\\inetpub\\wwwroot\\JenkinsAPP"

        HEALTH_CHECK_URL = "http://172.31.0.155:8080"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check .NET Version') {
            steps {
                bat '''
                    dotnet --version
                    dotnet --info
                '''
            }
        }

        stage('Restore') {
            steps {
                bat '''
                    dotnet restore "%PROJECT_PATH%"
                '''
            }
        }

        stage('Build') {
            steps {
                bat '''
                    dotnet build "%PROJECT_PATH%" --configuration Release --no-restore
                '''
            }
        }

        stage('Test') {
            steps {
                bat '''
                    dotnet test --configuration Release --no-build
                '''
            }
        }

        stage('Publish') {
            steps {
                bat '''
                    if exist "%PUBLISH_FOLDER%" rmdir /s /q "%PUBLISH_FOLDER%"

                    dotnet publish "%PROJECT_PATH%" ^
                        --configuration Release ^
                        --output "%PUBLISH_FOLDER%"
                '''
            }
        }

        stage('Deploy to Windows EC2') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'windows-ec2-credentials',
                        usernameVariable: 'WIN_USER',
                        passwordVariable: 'WIN_PASSWORD'
                    )
                ]) {

                    powershell '''
                        $ErrorActionPreference = "Stop"

                        $server = $env:TARGET_SERVER
                        $appPool = $env:IIS_APP_POOL
                        $deployPath = $env:DEPLOY_PATH

                        Write-Host "========================================="
                        Write-Host "Deploying JenkinsAPP"
                        Write-Host "Server   : $server"
                        Write-Host "App Pool : $appPool"
                        Write-Host "Path     : $deployPath"
                        Write-Host "========================================="

                        # Create credential
                        $password = ConvertTo-SecureString `
                            $env:WIN_PASSWORD `
                            -AsPlainText `
                            -Force

                        $credential = New-Object `
                            System.Management.Automation.PSCredential `
                            ($env:WIN_USER, $password)

                        Write-Host "Connecting to $server..."

                        $session = New-PSSession `
                            -ComputerName $server `
                            -Credential $credential `
                            -Authentication Negotiate

                        try {

                            Write-Host "Connected successfully."

                            # -----------------------------------------
                            # Check IIS Application Pool
                            # -----------------------------------------

                            Write-Host "Checking IIS Application Pool..."

                            Invoke-Command `
                                -Session $session `
                                -ArgumentList $appPool `
                                -ScriptBlock {

                                    param($appPool)

                                    Import-Module WebAdministration

                                    if (-not (Test-Path "IIS:\\AppPools\\$appPool")) {
                                        throw "IIS Application Pool '$appPool' does not exist."
                                    }

                                    Write-Host "Application Pool '$appPool' exists."

                                }

                            # -----------------------------------------
                            # Stop Application Pool
                            # -----------------------------------------

                            Write-Host "Stopping IIS Application Pool..."

                            Invoke-Command `
                                -Session $session `
                                -ArgumentList $appPool `
                                -ScriptBlock {

                                    param($appPool)

                                    Import-Module WebAdministration

                                    $state = (Get-WebAppPoolState `
                                        -Name $appPool).Value

                                    Write-Host "Current App Pool State: $state"

                                    if ($state -ne "Stopped") {

                                        Stop-WebAppPool `
                                            -Name $appPool

                                        Start-Sleep -Seconds 3

                                        Write-Host "Application Pool stopped."

                                    }
                                    else {

                                        Write-Host "Application Pool already stopped."

                                    }

                                }

                            # -----------------------------------------
                            # Prepare Deployment Directory
                            # -----------------------------------------

                            Write-Host "Cleaning deployment directory..."

                            Invoke-Command `
                                -Session $session `
                                -ArgumentList $deployPath `
                                -ScriptBlock {

                                    param($deployPath)

                                    if (Test-Path $deployPath) {

                                        Get-ChildItem `
                                            -Path $deployPath `
                                            -Force |
                                        Remove-Item `
                                            -Recurse `
                                            -Force

                                        Write-Host "Old files removed."

                                    }
                                    else {

                                        New-Item `
                                            -ItemType Directory `
                                            -Path $deployPath `
                                            -Force |
                                        Out-Null

                                        Write-Host "Deployment directory created."

                                    }

                                }

                            # -----------------------------------------
                            # Copy Published Application
                            # -----------------------------------------

                            Write-Host "Copying published files..."

                            Copy-Item `
                                -Path "$env:WORKSPACE\\publish\\*" `
                                -Destination $deployPath `
                                -ToSession $session `
                                -Recurse `
                                -Force

                            Write-Host "Files copied successfully."

                            # -----------------------------------------
                            # Verify Deployment
                            # -----------------------------------------

                            Write-Host "Verifying deployed files..."

                            Invoke-Command `
                                -Session $session `
                                -ArgumentList $deployPath `
                                -ScriptBlock {

                                    param($deployPath)

                                    $files = Get-ChildItem `
                                        -Path $deployPath `
                                        -File `
                                        -Recurse

                                    if ($files.Count -eq 0) {
                                        throw "No application files found in $deployPath"
                                    }

                                    Write-Host "Deployment contains $($files.Count) files."

                                }

                            # -----------------------------------------
                            # Start Application Pool
                            # -----------------------------------------

                            Write-Host "Starting IIS Application Pool..."

                            Invoke-Command `
                                -Session $session `
                                -ArgumentList $appPool `
                                -ScriptBlock {

                                    param($appPool)

                                    Import-Module WebAdministration

                                    Start-WebAppPool `
                                        -Name $appPool

                                    Start-Sleep -Seconds 5

                                    $state = (Get-WebAppPoolState `
                                        -Name $appPool).Value

                                    Write-Host "Application Pool State: $state"

                                    if ($state -ne "Started") {
                                        throw "Application Pool '$appPool' failed to start."
                                    }

                                    Write-Host "Application Pool started successfully."

                                }

                            Write-Host "========================================="
                            Write-Host "Deployment completed successfully!"
                            Write-Host "========================================="

                        }
                        finally {

                            if ($session) {
                                Remove-PSSession $session
                                Write-Host "PowerShell session closed."
                            }

                        }
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {

                powershell '''
                    $ErrorActionPreference = "Stop"

                    Write-Host "Waiting for application to start..."
                    Start-Sleep -Seconds 10

                    $url = $env:HEALTH_CHECK_URL

                    Write-Host "Health Check URL: $url"

                    try {

                        $response = Invoke-WebRequest `
                            -Uri $url `
                            -UseBasicParsing `
                            -TimeoutSec 30

                        Write-Host "HTTP Status Code: $($response.StatusCode)"

                        if ($response.StatusCode -ne 200) {
                            throw "Health check failed with HTTP status $($response.StatusCode)"
                        }

                        Write-Host "========================================="
                        Write-Host "APPLICATION HEALTH CHECK PASSED"
                        Write-Host "========================================="

                    }
                    catch {

                        Write-Error "Application Health Check Failed:"
                        Write-Error $_.Exception.Message

                        throw
                    }
                '''
            }
        }
    }

    post {

        success {
            echo '========================================='
            echo 'JenkinsAPP Deployment SUCCESSFUL'
            echo '========================================='
        }

        failure {
            echo '========================================='
            echo 'JenkinsAPP Deployment FAILED'
            echo '========================================='
        }

        always {
            cleanWs()
        }
    }
}
