Feature: Transfers

  Background:
    Given the API base url is set
    And I am logged in as a new user

  Scenario: Successful transfer updates both balances
    Given a source account exists with currency "USD" and balance 1000
    And a destination account exists with currency "USD" and balance 0
    When I transfer 300 from the source to the destination account
    Then the response status should be 201
    And the response should match the transfer contract
    And the balance of the source account should be 700
    And the balance of the destination account should be 300

  Scenario: Transfer creates ledger entries on both accounts
    Given a source account exists with currency "USD" and balance 1000
    And a destination account exists with currency "USD" and balance 0
    When I transfer 200 from the source to the destination account
    Then the response status should be 201
    When I fetch the ledger of the source account
    Then the ledger should contain at least one entry
    When I fetch the ledger of the destination account
    Then the ledger should contain at least one entry

  Scenario: Owner can fetch a completed transfer
    Given a source account exists with currency "USD" and balance 500
    And a destination account exists with currency "USD" and balance 0
    And I transfer 100 from the source to the destination account
    When I fetch the transfer
    Then the response status should be 200
    And the response should match the transfer contract

  Scenario: Insufficient funds are rejected and balances stay unchanged
    Given a source account exists with currency "USD" and balance 100
    And a destination account exists with currency "USD" and balance 0
    When I transfer 500 from the source to the destination account
    Then the response status should be 422
    And the response should match the error contract
    And the balance of the source account should be 100
    And the balance of the destination account should be 0

  Scenario Outline: Invalid transfer amounts are rejected
    Given a source account exists with currency "USD" and balance 1000
    And a destination account exists with currency "USD" and balance 0
    When I transfer <amount> from the source to the destination account
    Then the response status should be 400
    And the response should match the error contract
    And the balance of the source account should be 1000

    Examples:
      | amount |
      | 0      |
      | -50    |
      | 10.5   |

  Scenario: Transfer to the same account is rejected
    Given a source account exists with currency "USD" and balance 1000
    When I transfer 100 from the source account to itself
    Then the response status should be 400
    And the response should match the error contract

  Scenario: Currency mismatch is rejected
    Given a source account exists with currency "USD" and balance 1000
    And a destination account exists with currency "EUR" and balance 0
    When I transfer 100 from the source to the destination account
    Then the response status should be 400
    And the response should match the error contract

  Scenario: Transfer to an unknown account returns not found
    Given a source account exists with currency "USD" and balance 1000
    When I transfer 100 from the source account to an unknown account
    Then the response status should be 404
    And the response should match the error contract

  Scenario: Transfer from an account owned by someone else is forbidden
    Given a destination account exists with currency "USD" and balance 0
    And another user owns an account with currency "USD" and balance 1000
    When I transfer 100 from another user's account to the destination account
    Then the response status should be 403
    And the response should match the error contract

  Scenario: Transfer with missing fields is rejected
    When I send a transfer request without the required fields
    Then the response status should be 400
    And the response should match the error contract

  Scenario: Transfer without a valid token is rejected
    Given a source account exists with currency "USD" and balance 1000
    And a destination account exists with currency "USD" and balance 0
    And I use the token "invalid-token"
    When I transfer 100 from the source to the destination account
    Then the response status should be 401
    And the response should match the error contract