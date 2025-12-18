package com.nightmarket.core.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nightmarket.core.domain.IdempotencyKey;
import com.nightmarket.core.domain.User;
import com.nightmarket.core.repository.IdempotencyKeyRepository;
import com.nightmarket.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyKeyRepository idempotencyKeyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Optional<IdempotencyKey> getKey(String key, UUID userId, String requestBody) {
        Optional<IdempotencyKey> existing = idempotencyKeyRepository.findByKeyAndUserId(key, userId);
        
        if (existing.isPresent()) {
            String currentHash = hash(requestBody);
            if (!currentHash.equals(existing.get().getRequestHash())) {
                throw new IllegalStateException("Idempotency key reused with different payload");
            }
        }
        
        return existing;
    }

    @Transactional
    public void saveKey(String key, UUID userId, String requestBody, int status, Object responseBody) {
        User user = userRepository.getReferenceById(userId);
        
        IdempotencyKey idempotencyKey = new IdempotencyKey();
        idempotencyKey.setKey(key);
        idempotencyKey.setUser(user);
        idempotencyKey.setRequestHash(hash(requestBody));
        idempotencyKey.setResponseStatus(status);
        idempotencyKey.setCreatedAt(Instant.now());
        idempotencyKey.setExpiresAt(Instant.now().plusSeconds(86400)); // 24 hours
        
        try {
            idempotencyKey.setResponseBody(objectMapper.writeValueAsString(responseBody));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize response", e);
        }
        
        idempotencyKeyRepository.save(idempotencyKey);
    }

    private String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
