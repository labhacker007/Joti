"""Hunt execution connectors for XSIAM, Defender, Wiz."""
import json
import httpx
import asyncio
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from app.core.config import settings
from app.core.logging import logger


class HuntConnector:
    """Base class for hunt platform connectors."""
    
    def __init__(self, platform: str):
        self.platform = platform
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
    
    async def execute_query(self, query: str) -> Dict:
        """Execute a hunt query on the platform."""
        raise NotImplementedError
    
    def test_connection(self) -> bool:
        """Test connectivity to the platform."""
        raise NotImplementedError
    
    async def test_connection_async(self) -> Tuple[bool, str]:
        """Async test connectivity to the platform."""
        raise NotImplementedError


class XSIAMConnector(HuntConnector):
    """Palo Alto Networks XSIAM (Cortex XDR) hunt connector.
    
    Uses the Cortex XSIAM API for advanced hunting queries.
    API Docs: https://cortex.paloaltonetworks.com/api
    """
    
    def __init__(self, config: Dict = None):
        super().__init__("xsiam")
        if config:
            self.tenant_id = config.get("tenant_id")
            self.api_key = config.get("api_key")
            self.api_key_id = config.get("api_key_id", "1")
            self.fqdn = config.get("fqdn", "api.xdr.paloaltonetworks.com")
        else:
            self.tenant_id = settings.XSIAM_TENANT_ID
            self.api_key = settings.XSIAM_API_KEY
            self.api_key_id = getattr(settings, "XSIAM_API_KEY_ID", "1")
            self.fqdn = getattr(settings, "XSIAM_FQDN", "api.xdr.paloaltonetworks.com")
    
    def _get_headers(self) -> Dict[str, str]:
        """Generate headers for XSIAM API calls."""
        import hashlib
        import secrets
        import time
        
        # Generate nonce and timestamp for authentication
        nonce = secrets.token_hex(32)
        timestamp = str(int(time.time() * 1000))
        
        # Create auth string for advanced API key authentication
        auth_string = f"{self.api_key}{nonce}{timestamp}"
        auth_hash = hashlib.sha256(auth_string.encode()).hexdigest()
        
        return {
            "x-xdr-auth-id": str(self.api_key_id),
            "Authorization": self.api_key,
            "x-xdr-nonce": nonce,
            "x-xdr-timestamp": timestamp,
            "Content-Type": "application/json"
        }
    
    async def execute_query(self, query: str) -> Dict:
        """Execute XQL query in XSIAM."""
        if not self.tenant_id or not self.api_key:
            logger.warning("xsiam_credentials_not_configured")
            return {
                "status": "error",
                "message": "XSIAM credentials not configured",
                "results": [],
                "platform": "xsiam"
            }
        
        try:
            url = f"https://{self.fqdn}/public_api/v1/xql/start_xql_query/"
            
            payload = {
                "request_data": {
                    "query": query,
                    "tenants": [self.tenant_id] if self.tenant_id else [],
                    "timeframe": {
                        "from": int((datetime.utcnow() - timedelta(days=7)).timestamp() * 1000),
                        "to": int(datetime.utcnow().timestamp() * 1000)
                    }
                }
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Start the query
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                )
                
                if response.status_code != 200:
                    logger.error("xsiam_query_start_failed", status=response.status_code, body=response.text[:500])
                    return {
                        "status": "error",
                        "message": f"XSIAM API error: {response.status_code}",
                        "results": [],
                        "platform": "xsiam"
                    }
                
                result = response.json()
                query_id = result.get("reply", {}).get("query_id")
                
                if not query_id:
                    return {
                        "status": "error",
                        "message": "Failed to get query ID from XSIAM",
                        "results": [],
                        "platform": "xsiam"
                    }
                
                # Poll for results
                results_url = f"https://{self.fqdn}/public_api/v1/xql/get_query_results/"
                max_attempts = 30
                
                for attempt in range(max_attempts):
                    await asyncio.sleep(2)
                    
                    results_response = await client.post(
                        results_url,
                        headers=self._get_headers(),
                        json={"request_data": {"query_id": query_id}}
                    )
                    
                    if results_response.status_code == 200:
                        results_data = results_response.json()
                        status = results_data.get("reply", {}).get("status", "")
                        
                        if status == "SUCCESS":
                            query_results = results_data.get("reply", {}).get("results", {}).get("data", [])
                            logger.info("xsiam_query_completed", query_id=query_id, results_count=len(query_results))
                            return {
                                "status": "completed",
                                "platform": "xsiam",
                                "query_id": query_id,
                                "results_count": len(query_results),
                                "results": query_results[:100]  # Limit results for display
                            }
                        elif status in ("FAILED", "CANCELLED"):
                            return {
                                "status": "error",
                                "message": f"Query {status}",
                                "results": [],
                                "platform": "xsiam"
                            }
                
                return {
                    "status": "timeout",
                    "message": "Query timed out waiting for results",
                    "results": [],
                    "platform": "xsiam"
                }
                
        except httpx.TimeoutException:
            logger.error("xsiam_query_timeout")
            return {
                "status": "error",
                "message": "Request timeout",
                "results": [],
                "platform": "xsiam"
            }
        except Exception as e:
            logger.error("xsiam_query_error", error=str(e))
            return {
                "status": "error",
                "message": str(e),
                "results": [],
                "platform": "xsiam"
            }
    
    def test_connection(self) -> bool:
        """Test XSIAM connection (sync)."""
        return bool(self.tenant_id and self.api_key)
    
    async def test_connection_async(self) -> Tuple[bool, str]:
        """Test XSIAM connection asynchronously."""
        if not self.tenant_id or not self.api_key:
            return False, "Missing tenant_id or api_key"
        
        try:
            url = f"https://{self.fqdn}/public_api/v1/healthcheck"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 200:
                    return True, "Connection successful"
                else:
                    return False, f"API returned status {response.status_code}"
                    
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class DefenderConnector(HuntConnector):
    """Microsoft Defender for Endpoint Advanced Hunting connector.
    
    Uses Microsoft Graph Security API for threat hunting.
    API Docs: https://docs.microsoft.com/en-us/microsoft-365/security/defender-endpoint/run-advanced-query-api
    """
    
    def __init__(self, config: Dict = None):
        super().__init__("defender")
        if config:
            self.tenant_id = config.get("tenant_id")
            self.client_id = config.get("client_id")
            self.client_secret = config.get("client_secret")
        else:
            self.tenant_id = settings.DEFENDER_TENANT_ID
            self.client_id = settings.DEFENDER_CLIENT_ID
            self.client_secret = settings.DEFENDER_CLIENT_SECRET
    
    async def _get_access_token(self) -> Optional[str]:
        """Obtain OAuth2 access token from Azure AD."""
        if self._access_token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at - timedelta(minutes=5):
                return self._access_token
        
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials",
            "scope": "https://api.securitycenter.microsoft.com/.default"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(token_url, data=data)
                
                if response.status_code == 200:
                    token_data = response.json()
                    self._access_token = token_data.get("access_token")
                    expires_in = token_data.get("expires_in", 3600)
                    self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                    return self._access_token
                else:
                    logger.error("defender_token_failed", status=response.status_code, body=response.text[:500])
                    return None
                    
        except Exception as e:
            logger.error("defender_token_error", error=str(e))
            return None
    
    async def execute_query(self, query: str) -> Dict:
        """Execute KQL query in Microsoft Defender."""
        if not self.tenant_id or not self.client_id or not self.client_secret:
            logger.warning("defender_credentials_not_configured")
            return {
                "status": "error",
                "message": "Defender credentials not configured",
                "results": [],
                "platform": "defender"
            }
        
        try:
            access_token = await self._get_access_token()
            if not access_token:
                return {
                    "status": "error",
                    "message": "Failed to obtain access token",
                    "results": [],
                    "platform": "defender"
                }
            
            url = "https://api.securitycenter.microsoft.com/api/advancedhunting/run"
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {"Query": query}
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    results_data = result.get("Results", [])
                    
                    logger.info("defender_query_completed", results_count=len(results_data))
                    
                    return {
                        "status": "completed",
                        "platform": "defender",
                        "results_count": len(results_data),
                        "results": results_data[:100],  # Limit results
                        "schema": result.get("Schema", [])
                    }
                elif response.status_code == 400:
                    error_data = response.json()
                    return {
                        "status": "error",
                        "message": error_data.get("error", {}).get("message", "Invalid query"),
                        "results": [],
                        "platform": "defender"
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"API error: {response.status_code}",
                        "results": [],
                        "platform": "defender"
                    }
                    
        except httpx.TimeoutException:
            logger.error("defender_query_timeout")
            return {
                "status": "error",
                "message": "Request timeout",
                "results": [],
                "platform": "defender"
            }
        except Exception as e:
            logger.error("defender_query_error", error=str(e))
            return {
                "status": "error",
                "message": str(e),
                "results": [],
                "platform": "defender"
            }
    
    def test_connection(self) -> bool:
        """Test Defender connection (sync)."""
        return bool(self.tenant_id and self.client_id and self.client_secret)
    
    async def test_connection_async(self) -> Tuple[bool, str]:
        """Test Defender connection asynchronously."""
        if not self.tenant_id or not self.client_id or not self.client_secret:
            return False, "Missing tenant_id, client_id, or client_secret"
        
        try:
            access_token = await self._get_access_token()
            if access_token:
                return True, "Connection successful - token obtained"
            else:
                return False, "Failed to obtain access token"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class WizConnector(HuntConnector):
    """Wiz cloud security platform connector.
    
    Uses Wiz GraphQL API for cloud security queries.
    API Docs: https://docs.wiz.io/wiz-docs/docs/using-the-wiz-api
    """
    
    def __init__(self, config: Dict = None):
        super().__init__("wiz")
        if config:
            self.client_id = config.get("client_id")
            self.client_secret = config.get("client_secret")
            self.api_endpoint = config.get("api_endpoint", "https://api.us1.app.wiz.io/graphql")
            self.auth_endpoint = config.get("auth_endpoint", "https://auth.app.wiz.io/oauth/token")
        else:
            self.client_id = settings.WIZ_CLIENT_ID
            self.client_secret = settings.WIZ_CLIENT_SECRET
            self.api_endpoint = getattr(settings, "WIZ_API_ENDPOINT", "https://api.us1.app.wiz.io/graphql")
            self.auth_endpoint = getattr(settings, "WIZ_AUTH_ENDPOINT", "https://auth.app.wiz.io/oauth/token")
    
    async def _get_access_token(self) -> Optional[str]:
        """Obtain OAuth2 access token from Wiz."""
        if self._access_token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at - timedelta(minutes=5):
                return self._access_token
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.auth_endpoint,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "audience": "wiz-api"
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    self._access_token = token_data.get("access_token")
                    expires_in = token_data.get("expires_in", 3600)
                    self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                    return self._access_token
                else:
                    logger.error("wiz_token_failed", status=response.status_code)
                    return None
                    
        except Exception as e:
            logger.error("wiz_token_error", error=str(e))
            return None
    
    async def execute_query(self, query: str) -> Dict:
        """Execute GraphQL query in Wiz.
        
        The query parameter can be either:
        - A GraphQL query string
        - A JSON string containing filters for the standard Issues query
        """
        if not self.client_id or not self.client_secret:
            logger.warning("wiz_credentials_not_configured")
            return {
                "status": "error",
                "message": "Wiz credentials not configured",
                "results": [],
                "platform": "wiz"
            }
        
        try:
            access_token = await self._get_access_token()
            if not access_token:
                return {
                    "status": "error",
                    "message": "Failed to obtain access token",
                    "results": [],
                    "platform": "wiz"
                }
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Try to parse as JSON for filter-based query, otherwise use as GraphQL
            try:
                filters = json.loads(query)
                graphql_query = self._build_issues_query(filters)
            except json.JSONDecodeError:
                # Use as-is if it looks like GraphQL, otherwise wrap in issues query
                if query.strip().startswith("{") or query.strip().startswith("query"):
                    graphql_query = {"query": query}
                else:
                    graphql_query = self._build_search_query(query)
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_endpoint,
                    headers=headers,
                    json=graphql_query
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if "errors" in result:
                        return {
                            "status": "error",
                            "message": str(result["errors"]),
                            "results": [],
                            "platform": "wiz"
                        }
                    
                    # Extract results from various possible structures
                    data = result.get("data", {})
                    results_data = []
                    
                    for key in ["issues", "vulnerabilities", "cloudResources", "securityGraphSearch"]:
                        if key in data:
                            nodes = data[key].get("nodes", data[key].get("edges", []))
                            results_data = nodes if isinstance(nodes, list) else []
                            break
                    
                    logger.info("wiz_query_completed", results_count=len(results_data))
                    
                    return {
                        "status": "completed",
                        "platform": "wiz",
                        "results_count": len(results_data),
                        "results": results_data[:100]
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"API error: {response.status_code}",
                        "results": [],
                        "platform": "wiz"
                    }
                    
        except Exception as e:
            logger.error("wiz_query_error", error=str(e))
            return {
                "status": "error",
                "message": str(e),
                "results": [],
                "platform": "wiz"
            }
    
    def _build_issues_query(self, filters: Dict) -> Dict:
        """Build a GraphQL query for Wiz issues with filters."""
        return {
            "query": """
                query IssuesTable($filterBy: IssueFilters, $first: Int) {
                    issues(filterBy: $filterBy, first: $first) {
                        nodes {
                            id
                            control { id name }
                            createdAt
                            updatedAt
                            status
                            severity
                            entity { id name type }
                            note
                            dueAt
                        }
                    }
                }
            """,
            "variables": {
                "filterBy": filters,
                "first": 100
            }
        }
    
    def _build_search_query(self, search_term: str) -> Dict:
        """Build a GraphQL query for searching cloud resources."""
        return {
            "query": """
                query CloudResourceSearch($query: String!, $first: Int) {
                    cloudResources(search: $query, first: $first) {
                        nodes {
                            id
                            name
                            type
                            cloudPlatform
                            region
                            subscriptionId
                            tags
                        }
                    }
                }
            """,
            "variables": {
                "query": search_term,
                "first": 100
            }
        }
    
    def test_connection(self) -> bool:
        """Test Wiz connection (sync)."""
        return bool(self.client_id and self.client_secret)
    
    async def test_connection_async(self) -> Tuple[bool, str]:
        """Test Wiz connection asynchronously."""
        if not self.client_id or not self.client_secret:
            return False, "Missing client_id or client_secret"
        
        try:
            access_token = await self._get_access_token()
            if access_token:
                return True, "Connection successful - token obtained"
            else:
                return False, "Failed to obtain access token"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class SplunkConnector(HuntConnector):
    """Splunk Enterprise/Cloud connector for threat hunting.
    
    Uses Splunk REST API for running searches.
    API Docs: https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTsearch
    """
    
    def __init__(self, config: Dict = None):
        super().__init__("splunk")
        if config:
            self.host = config.get("host")
            self.port = config.get("port", 8089)
            self.token = config.get("token")
            self.username = config.get("username")
            self.password = config.get("password")
            self.index = config.get("index", "main")
            self.verify_ssl = config.get("verify_ssl", True)
        else:
            self.host = settings.SPLUNK_HOST
            self.port = getattr(settings, "SPLUNK_PORT", 8089)
            self.token = getattr(settings, "SPLUNK_TOKEN", None)
            self.username = getattr(settings, "SPLUNK_USERNAME", None)
            self.password = getattr(settings, "SPLUNK_PASSWORD", None)
            self.index = getattr(settings, "SPLUNK_INDEX", "main")
            self.verify_ssl = getattr(settings, "SPLUNK_VERIFY_SSL", True)
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers."""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    def _get_auth(self) -> Optional[Tuple[str, str]]:
        """Get basic auth tuple if using username/password."""
        if self.username and self.password:
            return (self.username, self.password)
        return None
    
    async def execute_query(self, query: str) -> Dict:
        """Execute SPL search in Splunk."""
        if not self.host:
            logger.warning("splunk_host_not_configured")
            return {
                "status": "error",
                "message": "Splunk host not configured",
                "results": [],
                "platform": "splunk"
            }
        
        if not self.token and not (self.username and self.password):
            logger.warning("splunk_credentials_not_configured")
            return {
                "status": "error",
                "message": "Splunk credentials not configured",
                "results": [],
                "platform": "splunk"
            }
        
        try:
            base_url = f"https://{self.host}:{self.port}"
            search_url = f"{base_url}/services/search/jobs"
            
            # Create search job
            search_query = query if query.strip().startswith("search") else f"search {query}"
            
            async with httpx.AsyncClient(timeout=120.0, verify=self.verify_ssl) as client:
                # Create the search job
                create_response = await client.post(
                    search_url,
                    headers=self._get_auth_headers(),
                    auth=self._get_auth(),
                    data={
                        "search": search_query,
                        "earliest_time": "-7d",
                        "latest_time": "now",
                        "output_mode": "json"
                    }
                )
                
                if create_response.status_code not in (200, 201):
                    logger.error("splunk_job_create_failed", status=create_response.status_code)
                    return {
                        "status": "error",
                        "message": f"Failed to create search job: {create_response.status_code}",
                        "results": [],
                        "platform": "splunk"
                    }
                
                job_data = create_response.json()
                sid = job_data.get("sid")
                
                if not sid:
                    return {
                        "status": "error",
                        "message": "Failed to get search ID from Splunk",
                        "results": [],
                        "platform": "splunk"
                    }
                
                # Poll for job completion
                job_status_url = f"{search_url}/{sid}"
                max_attempts = 60
                
                for attempt in range(max_attempts):
                    await asyncio.sleep(2)
                    
                    status_response = await client.get(
                        job_status_url,
                        headers=self._get_auth_headers(),
                        auth=self._get_auth(),
                        params={"output_mode": "json"}
                    )
                    
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        entry = status_data.get("entry", [{}])[0]
                        content = entry.get("content", {})
                        
                        is_done = content.get("isDone", False)
                        is_failed = content.get("isFailed", False)
                        
                        if is_failed:
                            return {
                                "status": "error",
                                "message": content.get("messages", [{}])[0].get("text", "Search failed"),
                                "results": [],
                                "platform": "splunk"
                            }
                        
                        if is_done:
                            # Get results
                            results_url = f"{search_url}/{sid}/results"
                            results_response = await client.get(
                                results_url,
                                headers=self._get_auth_headers(),
                                auth=self._get_auth(),
                                params={"output_mode": "json", "count": 100}
                            )
                            
                            if results_response.status_code == 200:
                                results_data = results_response.json()
                                results = results_data.get("results", [])
                                
                                logger.info("splunk_query_completed", sid=sid, results_count=len(results))
                                
                                return {
                                    "status": "completed",
                                    "platform": "splunk",
                                    "search_id": sid,
                                    "results_count": len(results),
                                    "results": results
                                }
                            else:
                                return {
                                    "status": "error",
                                    "message": "Failed to retrieve results",
                                    "results": [],
                                    "platform": "splunk"
                                }
                
                return {
                    "status": "timeout",
                    "message": "Search timed out",
                    "results": [],
                    "platform": "splunk"
                }
                
        except httpx.TimeoutException:
            logger.error("splunk_query_timeout")
            return {
                "status": "error",
                "message": "Request timeout",
                "results": [],
                "platform": "splunk"
            }
        except Exception as e:
            logger.error("splunk_query_error", error=str(e))
            return {
                "status": "error",
                "message": str(e),
                "results": [],
                "platform": "splunk"
            }
    
    def test_connection(self) -> bool:
        """Test Splunk connection (sync)."""
        return bool(self.host and (self.token or (self.username and self.password)))
    
    async def test_connection_async(self) -> Tuple[bool, str]:
        """Test Splunk connection asynchronously."""
        if not self.host:
            return False, "Missing host"
        if not self.token and not (self.username and self.password):
            return False, "Missing token or username/password"
        
        try:
            base_url = f"https://{self.host}:{self.port}"
            auth_url = f"{base_url}/services/authentication/current-context"
            
            async with httpx.AsyncClient(timeout=10.0, verify=self.verify_ssl) as client:
                response = await client.get(
                    auth_url,
                    headers=self._get_auth_headers(),
                    auth=self._get_auth(),
                    params={"output_mode": "json"}
                )
                
                if response.status_code == 200:
                    return True, "Connection successful"
                elif response.status_code == 401:
                    return False, "Authentication failed"
                else:
                    return False, f"API returned status {response.status_code}"
                    
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class VirusTotalConnector(HuntConnector):
    """VirusTotal connector for IOC enrichment and threat intelligence.
    
    API Docs: https://developers.virustotal.com/reference
    """
    
    def __init__(self, config: Dict = None):
        super().__init__("virustotal")
        if config:
            self.api_key = config.get("api_key")
        else:
            self.api_key = getattr(settings, "VIRUSTOTAL_API_KEY", None)
        
        self.base_url = "https://www.virustotal.com/api/v3"
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "x-apikey": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def execute_query(self, query: str) -> Dict:
        """Query VirusTotal for IOC information.
        
        Query format: type:value (e.g., 'ip:8.8.8.8', 'domain:evil.com', 'hash:abc123')
        """
        if not self.api_key:
            return {"error": "VirusTotal API key not configured", "results": [], "results_count": 0}
        
        try:
            # Parse query format
            parts = query.split(":", 1)
            if len(parts) != 2:
                return {"error": "Invalid query format. Use type:value", "results": [], "results_count": 0}
            
            ioc_type, ioc_value = parts[0].strip().lower(), parts[1].strip()
            
            # Map type to endpoint
            endpoint_map = {
                "ip": f"/ip_addresses/{ioc_value}",
                "domain": f"/domains/{ioc_value}",
                "hash": f"/files/{ioc_value}",
                "url": f"/urls/{ioc_value}",
                "file": f"/files/{ioc_value}"
            }
            
            endpoint = endpoint_map.get(ioc_type)
            if not endpoint:
                return {"error": f"Unknown IOC type: {ioc_type}", "results": [], "results_count": 0}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}{endpoint}",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    attributes = data.get("data", {}).get("attributes", {})
                    
                    # Extract relevant threat data
                    last_analysis = attributes.get("last_analysis_stats", {})
                    malicious = last_analysis.get("malicious", 0)
                    suspicious = last_analysis.get("suspicious", 0)
                    
                    return {
                        "status": "success",
                        "ioc_type": ioc_type,
                        "ioc_value": ioc_value,
                        "malicious_votes": malicious,
                        "suspicious_votes": suspicious,
                        "reputation": attributes.get("reputation", 0),
                        "last_analysis_date": attributes.get("last_analysis_date"),
                        "results_count": malicious + suspicious,
                        "results": [data.get("data", {})]
                    }
                elif response.status_code == 404:
                    return {"status": "not_found", "ioc_value": ioc_value, "results": [], "results_count": 0}
                else:
                    return {"error": f"API error: {response.status_code}", "results": [], "results_count": 0}
                    
        except Exception as e:
            logger.error("virustotal_query_error", error=str(e))
            return {"error": str(e), "results": [], "results_count": 0}
    
    async def test_connection_async(self) -> Tuple[bool, str]:
        if not self.api_key:
            return False, "API key not configured"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/ip_addresses/8.8.8.8",
                    headers=self._get_headers()
                )
                if response.status_code == 200:
                    return True, "Connection successful"
                elif response.status_code == 401:
                    return False, "Invalid API key"
                else:
                    return False, f"API returned {response.status_code}"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


class VMRayConnector(HuntConnector):
    """VMRay sandbox connector for malware analysis.
    
    API Docs: https://www.vmray.com/products/api/
    """
    
    def __init__(self, config: Dict = None):
        super().__init__("vmray")
        if config:
            self.api_key = config.get("api_key")
            self.base_url = config.get("base_url", "https://cloud.vmray.com/api")
        else:
            self.api_key = getattr(settings, "VMRAY_API_KEY", None)
            self.base_url = getattr(settings, "VMRAY_BASE_URL", "https://cloud.vmray.com/api")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"api_key {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def execute_query(self, query: str) -> Dict:
        """Query VMRay for sample analysis.
        
        Query format: hash:value or sample_id:value
        """
        if not self.api_key:
            return {"error": "VMRay API key not configured", "results": [], "results_count": 0}
        
        try:
            # Parse query
            parts = query.split(":", 1)
            if len(parts) != 2:
                return {"error": "Invalid query format. Use hash:value or sample_id:value", "results": [], "results_count": 0}
            
            query_type, query_value = parts[0].strip().lower(), parts[1].strip()
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                if query_type == "hash":
                    # Search by hash
                    response = await client.get(
                        f"{self.base_url}/sample",
                        headers=self._get_headers(),
                        params={"hash": query_value}
                    )
                elif query_type == "sample_id":
                    # Get specific sample
                    response = await client.get(
                        f"{self.base_url}/sample/{query_value}",
                        headers=self._get_headers()
                    )
                else:
                    return {"error": f"Unknown query type: {query_type}", "results": [], "results_count": 0}
                
                if response.status_code == 200:
                    data = response.json()
                    samples = data.get("data", [])
                    
                    results = []
                    for sample in samples if isinstance(samples, list) else [samples]:
                        results.append({
                            "sample_id": sample.get("sample_id"),
                            "sample_sha256": sample.get("sample_sha256"),
                            "sample_verdict": sample.get("sample_verdict"),
                            "sample_threat_names": sample.get("sample_threat_names", []),
                            "sample_is_malicious": sample.get("sample_is_malicious", False),
                            "sample_score": sample.get("sample_score", 0)
                        })
                    
                    return {
                        "status": "success",
                        "query_type": query_type,
                        "query_value": query_value,
                        "results_count": len(results),
                        "results": results
                    }
                elif response.status_code == 404:
                    return {"status": "not_found", "query_value": query_value, "results": [], "results_count": 0}
                else:
                    return {"error": f"API error: {response.status_code}", "results": [], "results_count": 0}
                    
        except Exception as e:
            logger.error("vmray_query_error", error=str(e))
            return {"error": str(e), "results": [], "results_count": 0}
    
    async def submit_sample(self, file_content: bytes, filename: str) -> Dict:
        """Submit a file sample for analysis."""
        if not self.api_key:
            return {"error": "VMRay API key not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                files = {"sample_file": (filename, file_content)}
                response = await client.post(
                    f"{self.base_url}/sample/submit",
                    headers={"Authorization": f"api_key {self.api_key}"},
                    files=files
                )
                
                if response.status_code in [200, 201]:
                    return {"status": "submitted", "data": response.json()}
                else:
                    return {"error": f"Submission failed: {response.status_code}"}
                    
        except Exception as e:
            return {"error": str(e)}
    
    async def test_connection_async(self) -> Tuple[bool, str]:
        if not self.api_key:
            return False, "API key not configured"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/system_info",
                    headers=self._get_headers()
                )
                if response.status_code == 200:
                    return True, "Connection successful"
                elif response.status_code == 401:
                    return False, "Invalid API key"
                else:
                    return False, f"API returned {response.status_code}"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


def get_connector(platform: str, config: Dict = None) -> Optional[HuntConnector]:
    """Get a connector instance for a platform.
    
    Args:
        platform: The platform name (xsiam, defender, wiz, splunk, virustotal, vmray)
        config: Optional configuration dict to override settings
    """
    connectors = {
        "xsiam": XSIAMConnector,
        "defender": DefenderConnector,
        "wiz": WizConnector,
        "splunk": SplunkConnector,
        "virustotal": VirusTotalConnector,
        "vmray": VMRayConnector
    }
    
    connector_class = connectors.get(platform.lower())
    if connector_class:
        return connector_class(config) if config else connector_class()
    else:
        logger.warning("unknown_hunt_platform", platform=platform)
        return None


def test_connector_with_config(platform: str, config: Dict) -> Tuple[bool, str]:
    """Test a connector using a provided configuration dict.

    Returns (ok: bool, message: str).
    This performs credential validation; real connectivity tests use async methods.
    """
    platform = (platform or "").lower()
    
    if platform == "xsiam":
        ok = bool(config.get("tenant_id") and config.get("api_key"))
        msg = "Credentials validated" if ok else "Missing tenant_id or api_key"
        return ok, msg

    if platform == "defender":
        ok = bool(config.get("tenant_id") and config.get("client_id") and config.get("client_secret"))
        msg = "Credentials validated" if ok else "Missing tenant_id, client_id or client_secret"
        return ok, msg

    if platform == "wiz":
        ok = bool(config.get("client_id") and config.get("client_secret"))
        msg = "Credentials validated" if ok else "Missing client_id or client_secret"
        return ok, msg

    if platform == "splunk":
        has_creds = config.get("token") or (config.get("username") and config.get("password"))
        ok = bool(config.get("host") and has_creds)
        msg = "Credentials validated" if ok else "Missing host or credentials (token or username/password)"
        return ok, msg

    if platform == "virustotal":
        ok = bool(config.get("api_key"))
        msg = "Credentials validated" if ok else "Missing api_key"
        return ok, msg

    if platform == "vmray":
        ok = bool(config.get("api_key"))
        msg = "Credentials validated" if ok else "Missing api_key"
        return ok, msg

    logger.warning("unknown_hunt_platform", platform=platform)
    return False, f"Unknown platform '{platform}'"


async def test_connector_connectivity(platform: str, config: Dict) -> Tuple[bool, str]:
    """Test actual connectivity to a platform.
    
    This performs a real API call to verify credentials work.
    """
    connector = get_connector(platform, config)
    if not connector:
        return False, f"Unknown platform: {platform}"
    
    return await connector.test_connection_async()
