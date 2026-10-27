from playwright.sync_api import sync_playwright
import sys

def run_qa():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Test routes
        routes = [
            "/bootcamp/intro-to-lr/lessons",
            "/bootcamp/intro-to-lr/lessons/grid",
            "/bootcamp/intro-to-lr/practice-drills",
            "/bootcamp/intro-to-lr/practice-drills/first-sentence-conclusions",
            "/bootcamp/intro-to-lr/practice-drills/rebuttal-conclusions",
            "/bootcamp/intro-to-lr/simulator"
        ]
        
        for route in routes:
            print(f"Testing {route}...")
            page.goto(f"http://localhost:5173{route}")
            page.wait_for_load_state('networkidle')
            
            # Basic sanity check: ensure no 404/empty content
            if page.content().find("404") != -1:
                print(f"FAILED: {route} returned 404")
            else:
                print(f"PASSED: {route} rendered")

        # Specific QA: Simulator Gate
        print("Testing Simulator Gate...")
        page.goto("http://localhost:5173/bootcamp/intro-to-lr/simulator")
        page.wait_for_load_state('networkidle')
        # Expect to be on workbook page due to lock redirect
        if "lessons" in page.url:
            print("PASSED: Simulator locked and redirected to workbook assessment")
        else:
            print(f"FAILED: Simulator unlocked or didn't redirect. URL: {page.url}")

        browser.close()

if __name__ == "__main__":
    run_qa()
