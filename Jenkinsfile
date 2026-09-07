pipeline {
    agent any

    environment {
        // .NET Project
        PROJECT_PATH = "MyMvcApp\\MyMvcApp.csproj"
        PUBLISH_FOLDER = "publish"

        // Target Windows EC2
        TARGET_SERVER = "10.0.1.100"

        // IIS Configuration
        IIS_APP_POOL = "MyMvcAppPool"
        IIS_SITE_NAME = "MyMvcApp"

        // Deployment folder on target EC2
        DEPLOY_PATH = "C:\\inetpub\\wwwroot\\MyMvcApp"
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

                    $username = $env:WIN_USER
                    $password = ConvertTo-SecureString `
                        $env:WIN_PASSWORD `
                        -AsPlainText `
                        -Force

                    $credential = New-Object `
                        System.Management.Automation.PSCredential `
                        ($username, $password)

                    Write-Host "Connecting to $server"

                    # Create PowerShell Remote Session
                    $session = New-PSSession `
                        -ComputerName $server `
                        -Credential $credential

                    Write-Host "Stopping IIS Application Pool"

                    Invoke-Command -Session $session -ScriptBlock {

                        Import-Module WebAdministration

                        $appPool = "MyMvcAppPool"

                        if (Test-Path "IIS:\\AppPools\\$appPool") {

                            Stop-WebAppPool -Name $appPool

                            Write-Host "Application Pool Stopped"
                        }

                    }

                    Write-Host "Cleaning old deployment files"

                    Invoke-Command -Session $session -ScriptBlock {

                        $deployPath = "C:\\inetpub\\wwwroot\\MyMvcApp"

                        if (Test-Path $deployPath) {

                            Get-ChildItem $deployPath -Force |
                            Remove-Item -Recurse -Force

                        }
                        else {

                            New-Item `
                                -ItemType Directory `
                                -Path $deployPath `
                                -Force
                        }

                    }

                    Write-Host "Copying published files"

                    Copy-Item `
                        -Path "$env:WORKSPACE\\publish\\*" `
                        -Destination "C:\\inetpub\\wwwroot\\MyMvcApp" `
                        -ToSession $session `
                        -Recurse `
                        -Force

                    Write-Host "Starting IIS Application Pool"

                    Invoke-Command -Session $session -ScriptBlock {

                        Import-Module WebAdministration

                        $appPool = "MyMvcAppPool"

                        Start-WebAppPool -Name $appPool

                        Write-Host "Application Pool Started"

                    }

                    Remove-PSSession $session

                    Write-Host "Deployment Completed Successfully!"

                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                powershell '''

                    Start-Sleep -Seconds 10

                    $url = "http://$env:TARGET_SERVER"

                    try {

                        $response = Invoke-WebRequest `
                            -Uri $url `
                            -UseBasicParsing `
                            -TimeoutSec 30

                        Write-Host "Application Status: $($response.StatusCode)"

                        if ($response.StatusCode -ne 200) {
                            throw "Health check failed"
                        }

                    }
                    catch {
                        Write-Error "Application Health Check Failed"
                        throw
                    }

                '''
            }
        }
    }

    post {

        success {
            echo 'Deployment completed successfully!'
        }

        failure {
            echo 'Deployment failed!'
        }

        always {
            cleanWs()
        }
    }
}