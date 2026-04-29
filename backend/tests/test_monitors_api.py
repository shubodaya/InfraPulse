def test_create_monitor(client):
    response = client.post(
        "/api/monitors",
        json={
            "name": "API Health",
            "target": "https://example.com/health",
            "monitor_type": "http",
            "interval_seconds": 60,
            "timeout_seconds": 5,
            "expected_status_code": 200,
            "tags": ["api", "production"],
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["id"] > 0
    assert payload["name"] == "API Health"
    assert payload["current_status"] == "unknown"
    assert payload["tags"] == ["api", "production"]

