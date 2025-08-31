<?php

/**
 * Returns a greeting string.
 * @param string $name The name to greet.
 * @return string The greeting message.
 */
function sayHello(string $name): string {
    return "Hello, " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . " from Accra!";
}