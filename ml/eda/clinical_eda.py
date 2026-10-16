"""Exploratory Data Analysis (EDA) for Clinical Triage & Physiological Vitals.

Performs standard tabular exploratory data analysis on clinical triage features:
- Missing value audit & data types
- Summary statistics (mean, std, median, IQR, min/max)
- Target class distribution (Non-Urgent, Urgent, Emergency)
- Pearson feature correlation matrix
- Automated visualization export (histograms, correlation heatmap, class balance)
"""

import os
from typing import Any, Dict, Optional
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless CLI / server use
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


def run_clinical_eda(
    csv_path: str = "data/clinical_triage_features.csv",
    output_plot_dir: Optional[str] = "data/eda"
) -> Dict[str, Any]:
    """Runs a complete EDA pipeline on the clinical triage dataset.
    
    Args:
        csv_path: Path to tabular CSV dataset.
        output_plot_dir: Directory where figures will be saved (or None).
        
    Returns:
        Structured dictionary containing statistical summaries and correlations.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Please run dataset generation first.")

    df = pd.read_csv(csv_path)

    # 1. Dataset Shape & Missing Values
    shape = df.shape
    missing_counts = df.isna().sum().to_dict()
    total_missing = int(df.isna().sum().sum())

    # 2. Target Class Balance
    class_map = {0: "Non-Urgent (Routine)", 1: "Urgent", 2: "Emergency"}
    target_counts = df["triage_level"].value_counts().sort_index().to_dict()
    target_pct = (df["triage_level"].value_counts(normalize=True).sort_index() * 100).round(2).to_dict()
    
    labeled_target_dist = {
        class_map.get(k, str(k)): {
            "count": int(target_counts.get(k, 0)),
            "percentage": float(target_pct.get(k, 0.0))
        }
        for k in sorted(target_counts.keys())
    }

    # 3. Numeric Features & Descriptive Statistics
    numeric_cols = [
        "age", "heart_rate", "systolic_bp", "diastolic_bp",
        "respiratory_rate", "oxygen_saturation", "body_temperature",
        "pain_score", "severe_bleeding", "altered_mental_status"
    ]
    numeric_df = df[numeric_cols]
    desc_df = numeric_df.describe().T

    stats_summary = {}
    for col in numeric_cols:
        stats_summary[col] = {
            "mean": round(float(desc_df.loc[col, "mean"]), 2),
            "std": round(float(desc_df.loc[col, "std"]), 2),
            "min": round(float(desc_df.loc[col, "min"]), 2),
            "median": round(float(desc_df.loc[col, "50%"]), 2),
            "max": round(float(desc_df.loc[col, "max"]), 2),
            "skewness": round(float(numeric_df[col].skew()), 2)
        }

    # 4. Correlation with Target Triage Level
    corr_matrix = df[numeric_cols + ["triage_level"]].corr()
    target_corr = corr_matrix["triage_level"].drop("triage_level").sort_values(ascending=False)
    
    correlation_ranking = {
        col: round(float(val), 3)
        for col, val in target_corr.items()
    }

    plots_saved = []

    # 5. Export Plots if directory provided
    if output_plot_dir:
        os.makedirs(output_plot_dir, exist_ok=True)
        sns.set_theme(style="whitegrid", font_scale=0.9)

        # Plot A: Class Distribution
        fig, ax = plt.subplots(figsize=(7, 4))
        colors = ["#22c55e", "#f59e0b", "#ef4444"]
        labels = [class_map.get(k, str(k)) for k in target_counts.keys()]
        values = [target_counts[k] for k in target_counts.keys()]
        bars = ax.bar(labels, values, color=colors, width=0.55, edgecolor="#1f2937", linewidth=1.2)
        ax.set_title("Clinical Triage Target Distribution (Class Balance)", fontsize=12, fontweight="bold", pad=12)
        ax.set_ylabel("Patient Count")
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f"{height} ({height/len(df)*100:.1f}%)",
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 4), textcoords="offset points",
                        ha="center", va="bottom", fontsize=9, fontweight="semibold")
        plt.tight_layout()
        class_plot_path = os.path.join(output_plot_dir, "class_distribution.png")
        plt.savefig(class_plot_path, dpi=160)
        plt.close(fig)
        plots_saved.append(class_plot_path)

        # Plot B: Feature Correlation Heatmap
        fig, ax = plt.subplots(figsize=(10, 8))
        mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
        sns.heatmap(
            corr_matrix,
            mask=mask,
            annot=True,
            fmt=".2f",
            cmap="vlag",
            vmin=-1,
            vmax=1,
            cbar_kws={"shrink": 0.8},
            ax=ax,
            linewidths=0.5
        )
        ax.set_title("Clinical Feature Pearson Correlation Matrix", fontsize=12, fontweight="bold", pad=14)
        plt.tight_layout()
        corr_plot_path = os.path.join(output_plot_dir, "correlation_matrix.png")
        plt.savefig(corr_plot_path, dpi=160)
        plt.close(fig)
        plots_saved.append(corr_plot_path)

        # Plot C: Vital Distributions by Triage Urgency
        key_vitals = ["heart_rate", "systolic_bp", "respiratory_rate", "oxygen_saturation"]
        fig, axes = plt.subplots(2, 2, figsize=(11, 8))
        axes = axes.flatten()

        for idx, vital in enumerate(key_vitals):
            sns.boxplot(
                data=df,
                x="triage_level",
                y=vital,
                hue="triage_level",
                palette=["#22c55e", "#f59e0b", "#ef4444"],
                ax=axes[idx],
                legend=False
            )
            axes[idx].set_title(f"{vital.replace('_', ' ').title()} by Triage Urgency", fontsize=10, fontweight="bold")
            axes[idx].set_xticks([0, 1, 2])
            axes[idx].set_xticklabels(["Non-Urgent", "Urgent", "Emergency"])
            axes[idx].set_xlabel("")

        plt.tight_layout()
        vitals_plot_path = os.path.join(output_plot_dir, "vital_distributions.png")
        plt.savefig(vitals_plot_path, dpi=160)
        plt.close(fig)
        plots_saved.append(vitals_plot_path)

    return {
        "dataset_shape": {
            "rows": int(shape[0]),
            "columns": int(shape[1])
        },
        "total_missing_values": total_missing,
        "missing_by_column": missing_counts,
        "target_distribution": labeled_target_dist,
        "descriptive_statistics": stats_summary,
        "correlation_with_urgency": correlation_ranking,
        "exported_plots": plots_saved
    }


def format_eda_summary_text(eda_report: Dict[str, Any]) -> str:
    """Formats an EDA report as a readable terminal string."""
    rows = eda_report["dataset_shape"]["rows"]
    cols = eda_report["dataset_shape"]["columns"]
    missing = eda_report["total_missing_values"]

    lines = [
        "=" * 70,
        " CLINICAL TRIAGE EXPLORATORY DATA ANALYSIS (EDA) REPORT",
        "=" * 70,
        f"Dataset Shape: {rows} rows x {cols} columns",
        f"Total Missing Values: {missing}",
        "",
        "--- TARGET CLASS DISTRIBUTION ---",
    ]
    for label, info in eda_report["target_distribution"].items():
        lines.append(f"  * {label:<22}: {info['count']:>5} samples ({info['percentage']:>5.1f}%)")

    lines.extend([
        "",
        "--- DESCRIPTIVE STATISTICS (KEY VITALS) ---",
        f"  {'Feature':<22} | {'Mean':>7} | {'Std':>6} | {'Min':>6} | {'Median':>6} | {'Max':>6}"
    ])
    lines.append("  " + "-" * 64)
    for feat, s in eda_report["descriptive_statistics"].items():
        lines.append(f"  {feat:<22} | {s['mean']:>7.1f} | {s['std']:>6.1f} | {s['min']:>6.1f} | {s['median']:>6.1f} | {s['max']:>6.1f}")

    lines.extend([
        "",
        "--- FEATURE CORRELATION WITH TRIAGE URGENCY (Pearson r) ---"
    ])
    for feat, corr in eda_report["correlation_with_urgency"].items():
        sign = "+" if corr > 0 else ""
        bar = "#" * int(abs(corr) * 20)
        lines.append(f"  {feat:<22}: {sign}{corr:>6.3f}  {bar}")

    if eda_report["exported_plots"]:
        lines.extend([
            "",
            "--- EXPORTED EDA VISUALIZATIONS ---"
        ])
        for p in eda_report["exported_plots"]:
            lines.append(f"  * Saved: {p}")

    lines.append("=" * 70)
    return "\n".join(lines)


if __name__ == "__main__":
    report = run_clinical_eda()
    print(format_eda_summary_text(report))
