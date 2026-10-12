# This file was completed as a coding test in order to be hired for an RA position
# through the Weatherhead Center for International Affairs. Please contact me
# (justinblack@college.harvard.edu) for additional details and/or the specifications
# for the assignment, if necessary.

library(haven)
library(tidyverse)
library(xtable)
library(ggplot2)


# Heat map libraries
library(rnaturalearth)
library(rnaturalearthdata)
library(sf)
library(RColorBrewer)

# ———————————————————————————————————
# 1. Data import and selection
# ———————————————————————————————————

# Read the Afrobarometer data for Round 7
raw_data <- read_spss(file = "../0_data_raw/r7_merged_data_34ctry.release.sav")

# Select only Country, Q1. Age, Q101. Gender, and Q4B. Your present living conditions
select_data <- raw_data |>
  select(
    "COUNTRY",
    "Q1",
    "Q101",
    "Q4B"
  )

# ———————————————————————————————————
# 2. Data cleaning
# ———————————————————————————————————

# Clean the data by
#   (a) renaming columns
#   (b) changing missing values to R's NA
#   (c) converting columns to correct types
cleaned_data <- select_data |>
  rename(
    country = COUNTRY,
    age = Q1,
    gender = Q101,
    livcond = Q4B
  ) |>
  mutate(
    # NOTE: -1 is for missing values; the rest are non-answers
    # If only missing values should be NA, remove cases besides -1
    # "Refused to answer" and "don't know" are problematic for age, since they
    # are stored as integers and could be misinterpreted as large ages in
    # analysis or visualization. There is also a "refused to answer" and "don't
    # know" response for livcond, but since it is a factor, this is not problematic.

    # gender: -1 = "Missing"; livcond: -1 = "Missing"; age: -1 = "Missing"
    # age: 999 = "Don't know"
    # age: 998 = "Refused to answer"
    age = case_when(age %in% c(-1, 998, 999) ~ NA_integer_, TRUE ~ age),
    gender = case_when(gender == -1 ~ NA, TRUE ~ gender),
    livcond = case_when(livcond == -1 ~ NA, TRUE ~ livcond)
  ) |>
  # All variables are stored as <dbl+lbl>, which necessitates typecasting
  mutate(
    country = as.character(as_factor(country, levels = "default")),
    age = as.integer(age),
    gender = as_factor(gender, levels = "default"),
    livcond = as_factor(livcond, levels = "default")
  )

# ———————————————————————————————————
# 3. Summary Statistics
# ———————————————————————————————————

# ———————————————————————————————————
# 3a. Avg. age, share of female
# ———————————————————————————————————

# Calculate the average age and share of female respondents for each country
data_avg_age_share_female <- cleaned_data |>
  group_by(country) |>
  summarise(
    avg_age = mean(age, na.rm = TRUE),
    share_female = mean(gender == "Female", na.rm = TRUE)
  )

# Export the results to a LaTeX table
library(xtable)
latex_table <- xtable(data_avg_age_share_female)
print(
  latex_table,
  file = "../3_output/data_avg_age_share_female.tex",
  include.rownames = FALSE
)

# —————————————————————————————————————————
# 3b. Bad livcond share by country, gender
# —————————————————————————————————————————

# Create a new binary column (1 if livcond is bad, 0 if not)
df_bad_cond <- cleaned_data |>
  mutate(
    bad_cond = livcond %in% c("Very Bad", "Fairly Bad")
  )

# ——————————————————————————————
# Plot 1: share_bad by country
# ——————————————————————————————

# Calculate the share of people in bad conditions by country
country_bad_cond <- df_bad_cond |>
  group_by(country) |>
  summarize(
    share_bad_cond = mean(bad_cond, na.rm = TRUE),
    .groups = "drop"
  )

# Plot this data on a dot plot using ggplot
country_plot <- ggplot(country_bad_cond, aes(x = country, y = share_bad_cond)) +
  geom_point() +
  scale_y_continuous(labels = scales::percent) +
  labs(
    x = "Country",
    y = "Share in 'Very/Fairly bad' Conditions"
  ) +
  theme_minimal() +
  theme(
    axis.text.x = element_text(angle = 90, vjust = 0.5, hjust = 1) # Country names are long, vertical is required to reduce graph width
  )

# Save to .pdf (width 7 for readability)
ggsave(
  "../3_output/share_bad_cond_by_country.pdf",
  plot = country_plot,
  width = 7
)


# ————————————————————————————————————————————————
# Plot 2: share_bad by country, faceted by gender
# ————————————————————————————————————————————————

# Calculate the share of people in bad conditions by country and gender
country_gender_bad_cond <- df_bad_cond |>
  filter(!is.na(gender)) |> # Ensure NA genders are dropped
  group_by(country, gender) |>
  summarize(
    share_bad_cond = mean(bad_cond, na.rm = TRUE),
    .groups = "drop"
  )

# Plot this on two seperate dot plots, faceted by gender
country_gender_plot_faceted <- ggplot(
  country_gender_bad_cond,
  aes(x = country, y = share_bad_cond)
) +
  geom_point() +
  scale_y_continuous(labels = scales::percent) +
  facet_wrap(~gender, nrow = 1) +
  labs(
    x = "Country",
    y = "Share in 'Very/Fairly bad' Conditions"
  ) +
  theme_minimal() +
  theme(
    axis.text.x = element_text(angle = 90, vjust = 0.5, hjust = 1),
  )

# Save to .pdf (width 14, given the extra plot)
ggsave(
  "../3_output/share_bad_cond_by_country_by_gender_faceted.pdf",
  plot = country_gender_plot_faceted,
  width = 14
)

# ——————————————————————————————————————————————————————————
# Plot 3: share_bad by country and gender, non-faceted
# ——————————————————————————————————————————————————————————

# No need to recalculate share by gender and country, as done above
# Plot on dot plot (two dots per country - one male, one female - by color)
# Though not formally "split" by gender, this graph is more readable and
# therefore provides a more effective avenue for analysis than the previous
country_gender_plot_non_faceted <- ggplot(
  country_gender_bad_cond,
  aes(x = country, y = share_bad_cond, color = gender, group = country)
) +
  geom_line(
    color = "grey70", # Draw a (small) line between male and female dots (for distinction)
    linewidth = 0.5
  ) +
  geom_point() +
  scale_color_manual(
    values = c(
      "Male" = "blue",
      "Female" = "red",
      "Missing" = "grey70" # NA genders are dropped, but this is necessary to prevent a warning since Missing is still a label on the factor element
    )
  ) +
  scale_y_continuous(labels = scales::percent) +
  labs(
    x = "Country",
    y = "Share in 'Very/Fairly bad' Conditions",
    color = "Gender"
  ) +
  theme_minimal() +
  theme(
    axis.text.x = element_text(angle = 90, vjust = 0.5, hjust = 1),
  )

# Save to pdf (width 7 for readability)
ggsave(
  "../3_output/share_bad_cond_by_country_by_gender_non_faceted.pdf",
  plot = country_gender_plot_non_faceted,
  width = 7
)

# ——————————————————————————————————————————————————————————
# 4. Heat map plot by country
# ——————————————————————————————————————————————————————————

# Convert factor levels to numbers, then calculate average across countries
# Rename some of the country names to match the NE_countries dataset, which
# will be imported later in order to construct the heat map
livcond_map_data <- cleaned_data |>
  mutate(
    livcond_num = as.numeric(livcond),
    country = recode(
      country,
      "Cabo Verde" = "Republic of Cabo Verde",
      "eSwatini" = "Kingdom of eSwatini",
      "Gambia" = "The Gambia",
      "São Tomé and Príncipe" = "São Tomé and Principe"
    )
  ) |>
  group_by(country) |>
  summarize(
    avg_livcond = mean(livcond_num, na.rm = TRUE),
    .groups = "drop"
  )


# Download and load all country-level polygons. Use ne_download instead of
# ne_countries because of Cabo Verde, Mauritius, and São Tomé and Príncipe
world_sf <- ne_download(
  scale = 50,
  type = "countries",
  category = "cultural",
  returnclass = "sf"
)

# Filter for African countries using UN_REGION instead of CONTINENT
# because NE data considers Mauritius to be of the "Seven Seas" continent
africa_sf <- world_sf |>
  filter(REGION_UN == "Africa")

# Join our liv cond data to our df of African countries
africa_livcond_sf <- africa_sf |>
  left_join(
    livcond_map_data,
    by = c("NAME_LONG" = "country")
  )

# Plot using geom_sf
map_plot <- ggplot(africa_livcond_sf) +
  geom_sf(aes(fill = avg_livcond), color = "white", size = 0.2) +
  scale_fill_distiller(
    palette = "RdYlGn", # Reds for worse living conditions, yellow for intermediate, green for best
    type = "seq",
    direction = 1,
    na.value = "grey90", # fallback for missing values
    name = "Avg. Living Condition",
    breaks = c(1, 2, 3, 4, 5),
    labels = c(
      "1 = Very bad",
      "2 = Fairly bad",
      "3 = Neither good nor bad",
      "4 = Fairly good",
      "5 = Very good"
    ),
    # Force all levels to show. Because no average is less than 3, this will
    # cause the heatmap colors to be less differentiated (mostly variation in
    # yellow and green hues, instead of red and orange). Adjusting to "c(3,5)
    # adds greater variation, but is less true to the actual data and displays
    # the neutral value (neither good nor bad) as red (may be construed as
    # a value judgement).
    limits = c(1, 5)
  ) +
  labs(
    title = "Average Living Conditions in Africa,\nAfrobarometer Round 7",
    caption = "Source: Afrobarometer R7 data"
  ) +
  theme(
    legend.title = element_text(
      size = 10,
      margin = margin(b = 10) # creates more breathing zoom, given that labels overflow legend height
    ),
    legend.title.align = 0.5, # center‐align legend title
    plot.title = element_text(hjust = 0.5), # center title
    plot.caption = element_text(size = 8),
    legend.position = "right",
    axis.text.x = element_blank(), # Keep all other elements blank; removes geographic coordinate axes
    axis.text.y = element_blank(),
    axis.ticks = element_blank(),
    axis.title.y = element_blank(),
    axis.title.x = element_blank(),
    rect = element_blank()
  )

# Save to PDF
ggsave(
  "../3_output/africa_avg_living_conditions_heatmap.pdf",
  plot = map_plot,
  width = 8,
  height = 6
)

# NOTE: If I had more time, I would create zoom boxes on the small islands.

# ——————————————————————————————————————————————————————————
# 5. Country-year dataset, exporting processed data
# ——————————————————————————————————————————————————————————

# Collapse the data by country, recalculating the averages for each variable
collapsed_data <- cleaned_data |>
  group_by(country) |>
  summarize(
    avg_age_r7 = mean(age, na.rm = TRUE),
    share_female_r7 = mean(gender == "Female", na.rm = TRUE),
    avg_livcond_r7 = mean(as.numeric(livcond), na.rm = TRUE),
    .groups = "drop"
  )

# Expand the data across the 3 years following its original release, total of 4
years_for_expansion <- 2017:2020
expanded_data <- collapsed_data |>
  crossing(year = years_for_expansion) |>
  arrange(country, year)

# Write the processed data in a .dta file for further analysis
write_dta(
  expanded_data,
  "../1_data_processed/country_panel_r7.dta"
)
