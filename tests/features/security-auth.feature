Feature: Authentication and authorization bypass attempts

  Background:
    Given the API base url is set

  Scenario: Public health endpoint needs no credentials
    When I call "GET" "/health" without credentials
    Then the response status should be 200

  # Every router must sit behind the auth middleware, so we hit every endpoint
  Scenario Outline: Protected endpoints reject requests without credentials
    When I call "<method>" "<path>" without credentials
    Then the response status should be 401
    And the response should match the error contract

    Examples:
      | method | path                                                           |
      | POST   | /accounts                                                      |
      | GET    | /accounts/00000000-0000-0000-0000-000000000000                 |
      | GET    | /accounts/00000000-0000-0000-0000-000000000000/ledger          |
      | POST   | /transfers                                                     |
      | GET    | /transfers/00000000-0000-0000-0000-000000000000                |
      | POST   | /payments                                                      |
      | GET    | /payments/00000000-0000-0000-0000-000000000000                 |
      | POST   | /payments/00000000-0000-0000-0000-000000000000/capture         |
      | POST   | /payments/00000000-0000-0000-0000-000000000000/refund          |

  # The middleware function is shared, so one endpoint is enough for header format variants
  Scenario Outline: Malformed or fake Authorization headers are rejected
    When I call "GET" "/accounts/00000000-0000-0000-0000-000000000000" with the Authorization header "<header>"
    Then the response status should be 401
    And the response should match the error contract

    Examples:
      | header                 |
      | Bearer not-a-real-token |
      | Basic dXNlcjpwYXNzd29yZA== |
      | Bearer                 |
      | just-a-token-no-scheme |

  Scenario: A valid token with one character changed is rejected
    When I call "GET" "/accounts/00000000-0000-0000-0000-000000000000" with a tampered valid token
    Then the response status should be 401
    And the response should match the error contract

  Scenario: Login without a password is rejected for an unregistered user
    When I log in as an unregistered user without a password
    Then the response status should be 401
    And the response should not contain a token

  Scenario: Login with a password is rejected for an unregistered user
    When I log in as an unregistered user with a password
    Then the response status should be 401
    And the response should not contain a token

  Scenario: Login without a password is rejected for a registered user
    Given a registered user exists
    When I log in as the registered user without a password
    Then the response status should be 401
    And the response should not contain a token

  Scenario: Login with a non-string password is rejected for a registered user
    Given a registered user exists
    When I log in as the registered user with a non-string password
    Then the response status should be 401
    And the response should not contain a token