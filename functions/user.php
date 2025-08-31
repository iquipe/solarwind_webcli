<?php

/**
 * Returns a list of users as an array of objects.
 * @return array
 */
function users(): array {
    return [
        ['id' => 101, 'name' => 'Kofi', 'role' => 'Admin', 'active' => true],
        ['id' => 102, 'name' => 'Ama', 'role' => 'User', 'active' => true],
        ['id' => 103, 'name' => 'Yaw', 'role' => 'User', 'active' => false]
    ];
}

function getUserCount(): int {
    return count(users());
}