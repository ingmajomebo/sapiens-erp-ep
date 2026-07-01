import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5173")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the Email field with 'admin@sapiens.com', fill the Password field with 'Admin1234!', then click the 'Sign in' button to log in.
        # admin@sapiens.com email field
        elem = page.get_by_placeholder('admin@sapiens.com', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("admin@sapiens.com")
        
        # -> Fill the Email field with 'admin@sapiens.com', fill the Password field with 'Admin1234!', then click the 'Sign in' button to log in.
        # •••••••• password field
        elem = page.get_by_placeholder('••••••••', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Admin1234!")
        
        # -> Fill the Email field with 'admin@sapiens.com', fill the Password field with 'Admin1234!', then click the 'Sign in' button to log in.
        # Sign in button
        elem = page.get_by_role('button', name='Sign in', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Sales' navigation item in the left sidebar to open the Sales section and view the Orders list.
        # Sales button
        elem = page.get_by_role('button', name='Sales', exact=True)
        await elem.click(timeout=10000)
        
        # -> Select the 'Pending' option from the 'All statuses' dropdown and verify the orders list updates to show pending orders (e.g., 'SO-2026-138') and that a confirmed order (e.g., 'SO-2026-142') is no longer shown.
        # All statuses Pending Confirmed Delivered Cancelled dropdown
        elem = page.locator("xpath=/html/body/div/div/div/main/div/div[2]/div[2]/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # --> Assertions to verify final state
        
        # --> Verify the sales orders list reflects the selected status
        # Assert: Order 'SO-2026-138' is visible in the orders list.
        await expect(page.locator("xpath=/html/body/div/div/div/main/div/div[2]/div[3]/table/tbody/tr/td[1]/span").nth(0)).to_have_text("SO-2026-138", timeout=15000), "Order 'SO-2026-138' is visible in the orders list."
        # Assert: The visible status for the order is 'Pending'.
        await expect(page.locator("xpath=/html/body/div/div/div/main/div/div[2]/div[3]/table/tbody/tr/td[7]/span").nth(0)).to_have_text("Pending", timeout=15000), "The visible status for the order is 'Pending'."
        # Assert: Only one order row is visible after applying the status filter.
        await expect(page.locator("xpath=/html/body/div/div/div/main/div/div[2]/div[3]/table/tbody/tr")).to_have_count(1, timeout=15000), "Only one order row is visible after applying the status filter."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    