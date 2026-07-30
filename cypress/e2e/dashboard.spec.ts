/// <reference types="cypress" />

// Cypress E2E spec for Operations Portal Dashboard
// NOTE: Update test credentials and API URLs before running.

const TEST_USER = {
  email: 'test.manager@example.com',
  password: 'TestPass123!',
};

function loginAndSetToken() {
  cy.request('POST', '/api/auth/login', { email: TEST_USER.email, password: TEST_USER.password })
    .its('body')
    .then((res) => {
      const token = res.access_token;
      // store in localStorage as the frontend expects
      window.localStorage.setItem('access_token', token);
    });
}

describe('Operations Dashboard – UI Flow', () => {
  before(() => {
    loginAndSetToken();
  });

  it('loads and shows KPI cards', () => {
    cy.visit('/operations/dashboard');
    cy.contains('Operations Portal – Dashboard').should('be.visible');
    // Wait for API calls to finish; replace selectors with real card titles.
    cy.get('.bg-white p.text-sm').should('have.length.at.least', 1);
  });
});