@race
Feature: Concurrency and race conditions

  Background:
    Given a user is logged in on the race server
    And a race source account exists with balance 1000
    And a race destination account exists with balance 0

  Scenario: Parallel transfers cannot spend more than the available balance
    When I send 5 parallel transfers of 400 with different idempotency keys
    Then exactly 2 of the parallel transfers should succeed
    And all other parallel transfers should be rejected with insufficient funds
    And the race source balance should never be negative
    And the race source balance should be 200
    And the race source ledger debits should total 800

  Scenario: Parallel requests with the same idempotency key debit the account only once
    When I send 5 parallel transfers of 100 with the same idempotency key
    Then all successful parallel responses should return the same transfer id
    And the race source balance should be 900
    And the race source ledger debits should total 100

      Scenario: Ledger stays balanced after parallel transfers
    Given I note the combined balance of both race accounts
    When I send 5 parallel transfers of 400 with different idempotency keys
    Then the combined balance of both race accounts should be unchanged
    And the source debits should equal the destination credits
    And every successful parallel transfer should have one debit and one credit