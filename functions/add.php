<?php

/**
 * Adds two numbers together.
 * @param int $a The first number.
 * @param int $b The second number.
 * @return int The sum of the two numbers.
 */
function add(int $a, int $b): int {
    return $a + $b;
}

/**
 * Subtracts two numbers.
 * @param int $a The first number.
 * @param int $b The second number.
 * @return int The difference of the two numbers.
 */
function subtract(int $a, int $b): int {
    return $a - $b;
}

/**
 * Multiplies two numbers.
 * @param int $a The first number.
 * @param int $b The second number.
 * @return int The product of the two numbers.
 */
function multiply(int $a, int $b): int {
    return $a * $b;
}

/**
 * Divides two numbers.
 * @param int $a The dividend.
 * @param int $b The divisor.
 * @return float The quotient of the two numbers.
 * @throws InvalidArgumentException If the divisor is zero.
 */
function divide(int $a, int $b): float {
    if ($b === 0) {
        throw new InvalidArgumentException("Division by zero is not allowed.");
    }
    return $a / $b;
}

/**
 * Calculates the power of a number.
 * @param int $base The base number.
 * @param int $exponent The exponent.
 * @return float The result of the power calculation.
 */
function power(int $base, int $exponent): float {
    return $base ** $exponent;
}

/**
 * Calculates the square root of a number.
 * @param int $number The number.
 * @return float The square root of the number.
 * @throws InvalidArgumentException If the number is negative.
 */
function squareRoot(int $number): float {
    if ($number < 0) {
        throw new InvalidArgumentException("Cannot calculate the square root of a negative number.");
    }
    return sqrt($number);
}

/**
 * Calculates the natural logarithm of a number.
 * @param int $number The number.
 * @return float The natural logarithm of the number.
 * @throws InvalidArgumentException If the number is less than or equal to zero.
 */
function naturalLog(int $number): float {
    if ($number <= 0) {
        throw new InvalidArgumentException("Cannot calculate the natural logarithm of a non-positive number.");
    }
    return log($number);
}