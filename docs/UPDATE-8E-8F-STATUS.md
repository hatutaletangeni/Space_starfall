# Release decision — Update 8E and first 8F pass

**Branch:** `feature/update-8e-completion-8f-workshops`

**Decision: DO NOT MERGE AS FULLY COMPLETED 8E OR 8F.**

Implemented:
- Existing shipped-ore refinery processing and timed ship-battery debit (8E).
- Six element-balanced chemical reaction specifications and actual-lot, real-vessel-gated chemical plant transaction model (8E, not exposed as playable equipment).
- A live source-integrated ship wire-drawing workbench and versioned machine recipes, with time, energy, source material, byproduct scrap and saved receipts (first vertical slice of 8F).
- Searchable UI21 Field Manual topics and source build hooks.
- Isolated chemical, manufacturing and cross-stage conservation tests. CI workflow builds downloadable offline standalone candidates, pending external run verification.

Missing: fully commissioned placed stations, piped/tanked gas phase behavior, real chemical purification from general generated ore, high-temperature metallurgy, complete machine shop and electronics, actual 7A/T15 installed manufactured parts, regression/GPU, and synchronized verified standalone.

Operator notes: On this branch, a landed ship's Engineer tab shows **REFINERY · SHIP FABRICATION** and **8F · MATERIAL FABRICATION & MACHINE TOOLS**. The latter requires a real certified copper stock lot; no material is provided for free. Advanced tool recipes display their missing hardware. To complete the industrial expedition, implement the missing infrastructure before asserting 8E or 8F release acceptance.

No changes have been merged to main by this feature branch.
