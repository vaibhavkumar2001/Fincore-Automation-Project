Feature: Accounts

  Background:
    Given the API base url is set
    And I am logged in as a new user

  Scenario: Create an account successfully
    When I create an account with currency "USD" and balance 1000
    Then the response status should be 201
    And the response should match the account contract
    And the account balance should be 1000

  Scenario: Create an account with zero balance
    When I create an account with currency "EUR" and balance 0
    Then the response status should be 201
    And the account balance should be 0

  Scenario: Reject an invalid currency code
    When I create an account with currency "US" and balance 100
    Then the response status should be 400
    And the response should match the error contract

  Scenario: Reject a negative initial balance
    When I create an account with currency "USD" and balance -5
    Then the response status should be 400
    And the response should match the error contract

  Scenario: Reject account creation with an invalid token
    Given I use the token "invalid-token"
    When I create an account with currency "USD" and balance 100
    Then the response status should be 401
    And the response should match the error contract

  Scenario: Owner can fetch their own account
    Given an account exists with currency "USD" and balance 250
    When I fetch the account
    Then the response status should be 200
    And the response should match the account contract
    And the account balance should be 250

  Scenario: Fetching another user's account is forbidden
    Given another user owns an account with currency "USD" and balance 500
    When I fetch another user's account
    Then the response status should be 403
    And the response should match the error contract

  Scenario: Fetching an unknown account returns not found
    When I fetch an account that does not exist
    Then the response status should be 404
    And the response should match the error contract

  Scenario: Ledger of a new account is available
    Given an account exists with currency "USD" and balance 100
    When I fetch the account ledger
    Then the response status should be 200
    And the response body should contain "entries"