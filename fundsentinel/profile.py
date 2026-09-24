"""Column profiling in code: what the Profiler agent reads instead of the raw file."""

import pandas as pd


def profile_columns(df: pd.DataFrame, samples: int = 5) -> list[dict]:
    out = []
    n = len(df)
    for col in df.columns:
        s = df[col]
        non_null = s.dropna()
        info = {"column": col, "dtype": str(s.dtype), "filled": round(len(non_null) / n, 3) if n else 0,
                "distinct": int(non_null.nunique()),
                "samples": [str(v)[:60] for v in non_null.drop_duplicates().head(samples).tolist()]}
        if pd.api.types.is_numeric_dtype(s) and len(non_null):
            info.update({"min": float(non_null.min()), "max": float(non_null.max()),
                         "median": float(non_null.median())})
        out.append(info)
    return out


def as_text(profile: list[dict]) -> str:
    """Compact one-line-per-column rendering for the prompt."""
    lines = []
    for p in profile:
        rng = f" range=[{p['min']:g}..{p['max']:g}] median={p['median']:g}" if "min" in p else ""
        lines.append(f"- {p['column']} ({p['dtype']}, filled {p['filled']:.0%}, {p['distinct']} distinct){rng}"
                     f" e.g. {p['samples']}")
    return "\n".join(lines)
