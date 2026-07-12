# Harness Intake

Fill what you know; ATLAS researches the rest. Only `problem` is mandatory.

```yaml
problem: >            # REQUIRED. The problem, service idea, or project — in your own words.
theme:                # optional. One of the catalog themes, or blank for custom.
client: >             # optional. Who this is for (team, company, individual, institution).
goals:                # optional. What success looks like, as outcomes.
  -
constraints:          # optional. Budget, jurisdiction, privacy, tooling, deadlines.
  -
data_needs: >         # optional. Data the Harness must consume or produce.
cadence: >            # optional. How often it must run/deliver (e.g. hourly, daily 09:00).
value_moves: false    # true if the Harness will hold or move money/assets.
public_voice: false   # true if it will post or reply publicly.
output_format: md     # md (Markdown file) | text (plain text in the delivery message)
language: en          # deliverable language
```
