Feature: Payments API

  Background:
    Given the API base url is set

  Scenario: Create a payment
    When I create a payment with amount 5000 and currency "INR"
    Then the response status should be 201
    And the response field "status" should equal "created"
    And the response should match the payment contract

  Scenario: Capture a created payment
    Given a payment exists with amount 5000 and currency "INR"
    When I capture the payment
    Then the response status should be 200
    And the response field "status" should equal "captured"
    And the response should match the payment contract

  Scenario: Refund before capture is rejected
    Given a payment exists with amount 5000 and currency "INR"
    When I refund the payment
    Then the response status should be 409
    And the response should match the error contract

  Scenario: Same idempotency key replays the same payment
    Given a payment exists with amount 5000 and currency "INR"
    When I repeat the create request with the same idempotency key and the same body
    Then the response status should be 201
    And the response header "Idempotent-Replayed" should equal "true"
    And the replayed payment should be the same as the first one

  Scenario: Same idempotency key with a different body is rejected
    Given a payment exists with amount 5000 and currency "INR"
    When I repeat the create request with the same idempotency key and amount 9999
    Then the response status should be 422
    And the response should match the error contract

  Scenario: Missing idempotency key is rejected
    When I create a payment without an idempotency key
    Then the response status should be 400
    And the response should match the error contract

  Scenario Outline: Invalid amounts are rejected
    When I create a payment with amount <amount> and currency "INR"
    Then the response status should be 400
    And the response should match the error contract

    Examples:
      | amount |
      | 0      |
      | -100   |
      | 10.5   |