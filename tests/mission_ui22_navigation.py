"""Navigate STARFALL's real, visible UI22 Mission workflow in Chromium tests.

UI21 tabs remain intentionally hidden for players; tests must not force-click
them or bypass the new mission hierarchy. This helper opens the public Mission
button, selects the user-visible stage, and opens its advanced workspace.
"""
STAGES = {
    "Overview": "Navigate",
    "Explore": "Explore",
    "Engineer": "Build",
    "Operate": "Operate",
    "Records": "Records",
}

def open_mission_route(page, route):
    if route not in STAGES:
        raise ValueError("Unknown Mission workspace route: " + str(route))
    button = page.locator("#sf-mission-button")
    assert button.is_visible(), "Mission button is not visible for this player context"
    if not page.locator("#sf-mission-flow.open").count():
        button.click()
    flow = page.locator("#sf-mission-flow.open")
    assert flow.is_visible(), "Mission workflow failed to open"
    flow.locator(".sf-flow-step", has_text=STAGES[route]).click()
    flow.locator(".sf-flow-workspace").click()
    assert page.locator("body.sf-workspace-open").count(), "Mission advanced workspace did not open"
    assert page.locator("#panel").is_visible(), "Engineering/mission panel is hidden"
