import pandas as pd
from mapping.scrape_esma import fetch_esma_mappings_for_isins

# Paths to the GLEIF and ESMA FIRDS LEI-ISIN files
GLEIF_LEI_ISIN_FILE = 'mapping/dbs/gleif_lei_isin.csv'
ESMA_LEI_ISIN_FILE = 'mapping/dbs/esma_lei_isin.csv'
MAPPING_CACHE_FILE = 'mapping/caches/mapping_cache.csv'

def normalize_isin(code):
    return str(code).strip().upper()


def load_gleif_mapping():
    """Load GLEIF ISIN->LEI mapping as a dict with normalized (upper) ISIN keys."""
    try:
        df = pd.read_csv(GLEIF_LEI_ISIN_FILE)
    except FileNotFoundError:
        raise ValueError(
            "GLEIF database is not found. Please download the GLEIF dataset from https://www.gleif.org/en/lei-data/lei-mapping/download-isin-to-lei-relationship-files."
        )

    # Standardize columns and values
    rename_map = {"ISIN": "isin", "LEI": "lei"}
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
    if not {"isin", "lei"}.issubset(df.columns):
        raise ValueError("GLEIF CSV must contain columns 'ISIN'/'isin' and 'LEI'/'lei'.")

    df = df[["isin", "lei"]].dropna(subset=["isin", "lei"])  # keep only valid rows
    df["isin"] = df["isin"].astype(str).map(normalize_isin)
    df["lei"] = df["lei"].astype(str).str.strip()
    # In case of duplicates, keep the last occurrence
    df = df.drop_duplicates(subset=["isin"], keep="last")
    return dict(zip(df["isin"], df["lei"]))


def read_cache():
    try:
        cache = pd.read_csv(MAPPING_CACHE_FILE)
    except FileNotFoundError:
        cache = pd.DataFrame(columns=["isin", "lei"])
    # Ensure expected columns exist
    if not {"isin", "lei"}.issubset(cache.columns):
        cache = pd.DataFrame(columns=["isin", "lei"])
    # Normalize types
    if not cache.empty:
        cache["isin"] = cache["isin"].astype(str)
        # allow lei to be NaN/None or string
        cache["lei"] = cache["lei"].astype(object)
    return cache


def update_cache(existing_cache, updates):
    """Merge updates (for provided ISINs) into the existing cache and write to disk."""
    updates_df = pd.DataFrame(updates, columns=["isin", "lei"]).copy()
    if not updates_df.empty:
        updates_df["isin"] = updates_df["isin"].astype(str)
    merged = pd.concat([existing_cache, updates_df], ignore_index=True)
    merged = merged.drop_duplicates(subset=["isin"], keep="last")
    merged.to_csv(MAPPING_CACHE_FILE, index=False)

def process_isins(isins, force_retry):
    """Map ISINs to LEIs by trying GLEIF first, then ESMA FIRDS for leftovers.

    - Prefer cached values when present.
    - Try GLEIF for all non-cached ISINs.
    - Call ESMA only for those still unresolved (unless previously missing and force_retry is False).
    """
    # Normalize the ISINs
    requested_isins = [normalize_isin(code) for code in isins]

    # Load datasets and cache
    gleif_map = load_gleif_mapping()
    
    # Read the cache; filter to only the requested ISINs if the cache is not empty, otherwise create an empty dataframe
    full_cache = read_cache()
    cache = full_cache[full_cache["isin"].isin(requested_isins)] if not full_cache.empty else pd.DataFrame(columns=["isin", "lei"])

    if not cache.empty:
        # Create a mask for the ISINs that have a LEI
        has_lei_mask = cache["lei"].notna() & (cache["lei"].astype(str).str.strip() != "")
        cached_map = dict(zip(cache.loc[has_lei_mask, "isin"], cache.loc[has_lei_mask, "lei"]))
        cached_missing = set(cache.loc[~has_lei_mask, "isin"].astype(str))
    else:
        cached_map = {}
        cached_missing = set()

    # First pass: GLEIF for items not already cached with a value
    gleif_results = {}
    for code in requested_isins:
        # To try with GLEIF: The ISIN musn't linked to an LEI in the cache AND one of the following must be true:
        # (1) The ISIN is not in cache_missing (i.e., never appears in the cache at all)
        # (2) Force_retry is True (we don't care if it's in cache_missing if we're forcing a retry)
        if (code not in cached_map) and (force_retry or code not in cached_missing):
            gleif_results[code] = gleif_map.get(code)
        else:
            # Otherwise, move onto ESMA
            continue

    # Second pass: ESMA only for items still unresolved
    esma_candidates = [
        code for code in requested_isins
        # To try with ESMA: The ISIN musn't be linked to an LEI in the cache AND must not be resolved by GLEIF AND one of the following must be true:
        # (1) The ISIN is not in cache_missing (i.e., never appears in the cache at all)
        # (2) Force_retry is True (we don't care if it's in cache_missing if we're forcing a retry)
        if (code not in cached_map) and (not gleif_results.get(code)) and (force_retry or code not in cached_missing)
    ]
    
    # Collect the results from the ESMA scraper for the ESMA candidates, or an empty dict if there are no ESMA candidates
    esma_results = fetch_esma_mappings_for_isins(esma_candidates) if esma_candidates else {}

    # Assemble final mapping, preferring cache > GLEIF > ESMA
    final_records = []
    for code in requested_isins:
        lei = (
            cached_map.get(code)
            or gleif_results.get(code)
            or esma_results.get(code)
        )
        final_records.append({"isin": code, "lei": lei})

    # Update cache on disk, keeping entries for ISINs not requested this run
    update_cache(full_cache, final_records)

    return pd.DataFrame(final_records, columns=["isin", "lei"])

def isins_to_leis(isins, force_retry):
    """Map a list of ISINs to their LEIs using GLEIF first, then ESMA for leftovers."""
    mapping = process_isins(isins, force_retry)
    return mapping.to_dict(orient='records')
