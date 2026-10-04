import { test as base } from '@playwright/test';
import { initialState as freshState } from '../../src/state/model';
export { expect, type Page, type Locator } from '@playwright/test';
export { type AppState } from '../../src/state/model';
// Existing feature journeys begin after onboarding; onboarding.spec exercises fresh installs.
export const initialState = (now?: number) => ({ ...freshState(now), onboardingComplete: true });
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((state) => {
      if (!localStorage.getItem('snuff.mobile.v2'))
        localStorage.setItem('snuff.mobile.v2', JSON.stringify(state));
    }, initialState());
    await use(page);
  },
});
