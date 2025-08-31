<?php

/**
 * Hashes a string using a secure hashing algorithm.
 * @param string $input The string to hash.
 * @return string The hashed string.
 */
function hashString(string $input): string {
    if(empty($input)){
        throw new InvalidArgumentException("Input string cannot be empty");
    }elseif(strtolower($input) == 'help'){
        return "Usage: hashString(string)\nHashes the input string using bcrypt.";
    }
    return password_hash($input, PASSWORD_BCRYPT);
}

function verifyHash(string $input, string $hash): bool {
    return password_verify($input, $hash);
}