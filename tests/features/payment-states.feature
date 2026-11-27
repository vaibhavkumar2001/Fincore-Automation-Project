Feature: Payment state machine

  Background:
    Given the API base url is set
    And I am logged in as a new user

  Scenario Outline: Every state and action combination follows the state machine
    Given a payment exists with amount 5000 and currency "INR"
    And the payment is in the "<state>" state
    When I perform the "<action>" action on the payment
    Then the response status should be <status>
    And the stored payment status should be "<final_state>"

    Examples:
      | state    | action  | status | final_state |
      | created  | capture | 200    | captured    |
      | created  | refund  | 409    | created     |
      | captured | capture | 409    | captured    |
      | captured | refund  | 200    | refunded    |
      | refunded | capture | 409    | refunded    |
      | refunded | refund  | 409    | refunded    |

  Scenario Outline: Actions on an unknown payment return not found
    When I perform the "<action>" action on an unknown payment
    Then the response status should be 404
    And the response should match the error contract

    Examples:
      | action  |
      | capture |
      | refund  |

  Scenario: Fetching an unknown payment returns not found
    When I fetch an unknown payment
    Then the response status should be 404
    And the response should match the error contract

  Scenario: Capturing a payment with an invalid token is rejected
    Given a payment exists with amount 5000 and currency "INR"
    And I use the token "invalid-token"
    When I perform the "capture" action on the payment
    Then the response status should be 401
    And the response should match the error contract