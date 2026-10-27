# AI Med ML Subsystem Convenience Runner
param (
    [string]$Action = "test"
)

$PythonExe = ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
    & ".venv\Scripts\pip.exe" install -e .
    & ".venv\Scripts\pip.exe" install pillow
}

switch ($Action.ToLower()) {
    "test" {
        Write-Host "Running full ML test suite..."
        & $PythonExe -m pytest tests -v
    }
    "serve" {
        Write-Host "Starting FastAPI ML Engine..."
        & $PythonExe cli.py serve --port 8000 --reload
    }
    "evaluate" {
        Write-Host "Running clinical safety benchmark..."
        & $PythonExe cli.py evaluate
    }
    "curate" {
        Write-Host "Curating dataset..."
        & $PythonExe cli.py curate --split
    }
    "train" {
        Write-Host "Running LoRA training pipeline..."
        & $PythonExe cli.py train --epochs 3
    }
    "train-classical" {
        Write-Host "Running classical ML training and benchmark..."
        & $PythonExe cli.py train-classical
    }
    "eda" {
        Write-Host "Running exploratory data analysis..."
        & $PythonExe cli.py eda
    }
    default {
        Write-Host "Usage: .\run.ps1 [test|serve|evaluate|curate|train|train-classical|eda]"
    }
}
