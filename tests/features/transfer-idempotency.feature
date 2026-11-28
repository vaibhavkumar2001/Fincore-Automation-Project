Feature: Transfer idempotency

  Background:
    Given the API base url is set
    And I am logged in as a new user
    And a source account exists with currency "USD" and balance 1000
    And a destination account exists with currency "USD" and balance 0

  Scenario: Replaying a transfer with the same key debits the source only once
    When I transfer 300 from the source to the destination account with a new idempotency key
    Then the response status should be 201
    When I repeat the transfer request with the same idempotency key and the same body
    Then the response status should be 201
    And the response header "Idempotent-Replayed" should equal "true"
    And the transfer id should be the same as the first one
    And the balance of the source account should be 700
    And the balance of the destination account should be 300

  Scenario: Same key with a different amount is rejected and balances stay unchanged
    When I transfer 300 from the source to the destination account with a new idempotency key
    Then the response status should be 201
    When I repeat the transfer request with the same idempotency key and amount 500
    Then the response status should be 422
    And the response should match the error contract
    And the balance of the source account should be 700
    And the balance of the destination account should be 300

  Scenario: Different keys with the same body create two separate transfers
    When I transfer 300 from the source to the destination account with a new idempotency key
    Then the response status should be 201
    When I send the same transfer again with a new idempotency key
    Then the response status should be 201
    And the transfer id should differ from the first one
    And the balance of the source account should be 400
    And the balance of the destination account should be 600

  Scenario: Missing idempotency key is rejected and balances stay unchanged
    When I send a transfer of 300 without an idempotency key
    Then the response status should be 400
    And the response should match the error contract
    And the balance of the source account should be 1000
    And the balance of the destination account should be 0

  Scenario: Replaying a failed transfer returns the same error and balances stay unchanged
    When I transfer 5000 from the source to the destination account with a new idempotency key
    Then the response status should be 422
    When I repeat the transfer request with the same idempotency key and the same body
    Then the response status should be 422
    And the response header "Idempotent-Replayed" should equal "true"
    And the response should match the error contract
    And the balance of the source account should be 1000
    And the balance of the destination account should be 0