<?php
$argv[1] ='pass123';
// This is a command-line script to generate a secure password hash.
// Check if a password was provided as the first argument.
if (isset($argv[1])) {
    $password = $argv[1];
    
    // Hash the password using PHP's recommended default algorithm (currently bcrypt).
    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    // Output the results for the user to copy.
    echo "Password to hash: " . $password . "\n";
    echo "Generated Hash:   " . $hash . "\n\n";
    echo "Copy the 'Generated Hash' value and paste it into your .env file.\n";
} else {
    // If no password was provided, show the user how to use the script.
    echo "Usage: php hash_password.php 'your-secret-password'\n";
    echo "       (Remember to put your password in quotes if it contains special characters)\n";
}

if (password_verify($password, $hash)) {
    echo "Password verification successful!\n";
} else {
    echo "Password verification failed.\n";
}