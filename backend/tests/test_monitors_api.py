
def test_update_monitor_rejects_invalid_target(client):
    create_response = client.post(
        "/api/monitors",
        json={
            "name": "API Health",
            "target": "https://example.com/health",
            "monitor_type": "http",
        },
    )
    assert create_response.status_code == 201
    monitor_id = create_response.json()["id"]

    response = client.put(
        f"/api/monitors/{monitor_id}",
        json={"target": "not-a-url"},
    )

    assert response.status_code == 422

    # Confirm the original target was not changed.
    get_response = client.get(f"/api/monitors/{monitor_id}")
    assert get_response.status_code == 200
    assert get_response.json()["target"] == "https://example.com/health"


def test_update_monitor_rejects_incompatible_type_and_target(client):
    create_response = client.post(
        "/api/monitors",
        json={
            "name": "API Health",
            "target": "https://example.com/health",
            "monitor_type": "http",
        },
    )
    assert create_response.status_code == 201
    monitor_id = create_response.json()["id"]

    response = client.put(
        f"/api/monitors/{monitor_id}",
        json={"monitor_type": "dns"},
    )

    assert response.status_code == 422

    get_response = client.get(f"/api/monitors/{monitor_id}")
    assert get_response.status_code == 200
    assert get_response.json()["monitor_type"] == "http"
    assert get_response.json()["target"] == "https://example.com/health"


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
