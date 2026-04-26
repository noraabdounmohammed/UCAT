/**
 * Canonical list of UK undergraduate medical schools, ordered alphabetically.
 *
 * Used by the cohort-selection modal to replace the previous free-text input
 * with a closed dropdown. Keeping this list in code (not the database) means
 * the leaderboard groups stay clean — no "Imperial", "Imperial College", and
 * "Imperial College London" splitting the same cohort.
 *
 * Source: GMC list of UK medical schools awarding a primary medical
 * qualification (PMQ), April 2026. New medical schools are added very rarely
 * (typically one per academic year); update this list when one launches.
 *
 * If a user attends a school not on the list, they pick "Other (UK)" — those
 * users still appear in the leaderboard but in a single shared bucket. (We
 * deliberately keep "Other (UK)" rather than free text to avoid fragmenting
 * cohorts; if a meaningful share of users land in "Other", add the missing
 * schools and migrate.)
 */
export const UK_MEDICAL_SCHOOLS: readonly string[] = [
  'Anglia Ruskin University',
  'Aston Medical School',
  'Barts and The London (QMUL)',
  'Brighton and Sussex Medical School',
  'Brunel Medical School',
  'Cardiff University',
  'Edge Hill University',
  'Hull York Medical School',
  'Imperial College London',
  "Keele University",
  'Kent and Medway Medical School',
  "King's College London",
  'Lancaster University',
  'Leicester Medical School',
  'Norwich Medical School (UEA)',
  'Plymouth University',
  'Queen Mary University of London',
  "Queen's University Belfast",
  'St George\'s, University of London',
  'Swansea University',
  'University of Aberdeen',
  'University of Birmingham',
  'University of Bristol',
  'University of Buckingham',
  'University of Cambridge',
  'University of Central Lancashire',
  'University of Chester',
  'University of Dundee',
  'University of East Anglia',
  'University of Edinburgh',
  'University of Exeter',
  'University of Glasgow',
  'University of Leeds',
  'University of Lincoln',
  'University of Liverpool',
  'University of Manchester',
  'University of Newcastle',
  'University of Nottingham',
  'University of Oxford',
  'University of Sheffield',
  'University of Southampton',
  'University of St Andrews',
  'University of Sunderland',
  'University of Surrey',
  'University of Warwick',
  'Ulster University',
  'Other (UK)',
] as const;

export type UkMedicalSchool = (typeof UK_MEDICAL_SCHOOLS)[number];
