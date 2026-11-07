"""Exercise the VISIBLE 8E-R UI22 mission workflow during browser regressions.

Never click hidden UI21 tabs, never bypass routing through JS or mutate game
state. This preserves existing simulation integration checks after UI22.
"""
def open_route(page,route):
    stages={'Overview':0,'Explore':1,'Engineer':2,'Operate':3,'Records':4}
    if route not in stages:
        raise AssertionError('Unsupported mission route '+str(route))
    button=page.locator('#sf-mission-button')
    if not button.count():
        page.locator('#ui21-navigation button[data-route="'+route+'"]').click()
        return
    if not button.is_visible():
        raise AssertionError('MISSION menu not available outside truck cockpit')
    button.click()
    panel=page.locator('#sf-mission-flow')
    assert panel.is_visible(), 'Mission workflow must visibly open'
    panel.locator('button.sf-flow-step').nth(stages[route]).click()
    panel.locator('button.sf-flow-workspace').click()
    page.wait_for_function("""r=>{
       const n=document.querySelector('#ui21-pages .ui21-page[data-page="'+r+'"]');
       return !!n&&!n.hidden&&document.body.classList.contains('sf-workspace-open');
    }""",arg=route,timeout=10000)
    assert not panel.is_visible(), 'Mission workflow should close after selecting source-owned workspace'
