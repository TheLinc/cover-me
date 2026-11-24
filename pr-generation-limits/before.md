## 1. tailor, description: ["..."], Accept: application/x-ndjson, usage 9 of 10
status 200, body ["start","thinking","thinking","delta","delta","delta","delta","delta","delta","delta","delta","delta","error"]
model calls 4, usage after 9

## 2. generate, model replies 200 with stop_reason "refusal" and no text
status 200, body {"error":"Empty response from AI. Please try again."}
usage after 0

## 3. generate, Anthropic answers 529 overloaded
status 200, body {"error":"AI generation failed. Please try again."}
usage after 0

## 4. tailor, the resume parse reply is "Sorry, I cannot help."
status 502, body {"error":"Could not process your resume. Please try again."}
usage after 0

## 5. tailor, posting of distinct capitalized words
15,000 chars: status 200, 345 ms
160,000 chars: status 546, 3080 ms

## 6. generate, 1.1 MB body (supplemental of 1,100,000 chars)
status 200, body 995 chars
usage after 1

