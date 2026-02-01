# GenAI Model Configuration System - Implementation Proposal

**Date:** January 28, 2026  
**Status:** 📋 **PROPOSAL**

---

## Executive Summary

Implement a comprehensive, multi-level GenAI model configuration system that allows admins to:
- Configure model parameters (temperature, max_tokens, top_p, etc.) per use-case
- Set model preferences per function
- Control costs and quality tradeoffs
- A/B test different configurations
- Override settings at runtime

---

## 🎯 Problem Statement

### Current Limitations

1. **Hardcoded Parameters** - Model settings are fixed in code
2. **No Use-Case Optimization** - Same settings for all tasks
3. **No Admin Control** - Can't adjust without code changes
4. **No Cost Control** - Can't optimize for cost vs quality
5. **No A/B Testing** - Can't experiment with settings

### Impact

- Suboptimal results for different use cases
- Higher costs than necessary
- Inflexible system
- Difficult to tune and optimize

---

## ✅ Proposed Solution

### Three-Level Configuration Hierarchy

```
┌─────────────────────────────────────────┐
│     Global Defaults (System-wide)       │
│  temperature: 0.3, max_tokens: 2000     │
└──────────────┬──────────────────────────┘
               │ Overrides ↓
┌──────────────┴──────────────────────────┐
│   Model-Specific Defaults (Per model)   │
│  gpt-4: temp=0.2, tokens=4000           │
│  llama3: temp=0.3, tokens=2000          │
└──────────────┬──────────────────────────┘
               │ Overrides ↓
┌──────────────┴──────────────────────────┐
│  Use-Case Specific (Per function)       │
│  extraction: temp=0.1, tokens=2000      │
│  summarization: temp=0.3, tokens=500    │
│  hunt: temp=0.2, tokens=3000            │
│  chatbot: temp=0.7, tokens=1000         │
└──────────────┬──────────────────────────┘
               │ Overrides ↓
┌──────────────┴──────────────────────────┐
│    Runtime Override (API call)          │
│  Specific request parameters            │
└─────────────────────────────────────────┘
```

### Configurable Parameters

**Core Parameters:**
- `temperature` - Randomness (0.0-2.0)
- `max_tokens` - Maximum output length
- `top_p` - Nucleus sampling (0.0-1.0)
- `frequency_penalty` - Reduce repetition (-2.0 to 2.0)
- `presence_penalty` - Encourage diversity (-2.0 to 2.0)

**Advanced Parameters:**
- `stop_sequences` - Stop generation at specific tokens
- `timeout_seconds` - Request timeout
- `retry_attempts` - Number of retries on failure
- `preferred_model` - Model to use for this use case

**Cost Control:**
- `max_cost_per_request` - Maximum cost limit
- `fallback_model` - Cheaper model to use if cost exceeded

---

## 🗄️ Database Schema

### New Table: `genai_model_configs`

```sql
CREATE TABLE genai_model_configs (
    id SERIAL PRIMARY KEY,
    
    -- Configuration identification
    config_name VARCHAR(100) UNIQUE NOT NULL,
    config_type VARCHAR(20) NOT NULL, -- 'global', 'model', 'use_case'
    model_identifier VARCHAR(100), -- e.g., 'openai:gpt-4', NULL for global
    use_case VARCHAR(50), -- e.g., 'extraction', 'summarization'
    
    -- Model parameters
    temperature FLOAT DEFAULT 0.3,
    max_tokens INTEGER DEFAULT 2000,
    top_p FLOAT DEFAULT 0.9,
    frequency_penalty FLOAT DEFAULT 0.0,
    presence_penalty FLOAT DEFAULT 0.0,
    
    -- Advanced parameters
    stop_sequences JSON DEFAULT '[]',
    timeout_seconds INTEGER DEFAULT 30,
    retry_attempts INTEGER DEFAULT 3,
    preferred_model VARCHAR(100),
    
    -- Cost control
    max_cost_per_request FLOAT,
    fallback_model VARCHAR(100),
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Performance tracking
    avg_response_time_ms INTEGER,
    avg_tokens_used INTEGER,
    avg_cost_per_request FLOAT,
    total_requests INTEGER DEFAULT 0,
    success_rate FLOAT,
    
    -- Audit
    created_by_user_id INTEGER REFERENCES users(id),
    updated_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_temperature CHECK (temperature >= 0.0 AND temperature <= 2.0),
    CONSTRAINT check_top_p CHECK (top_p >= 0.0 AND top_p <= 1.0),
    CONSTRAINT check_frequency_penalty CHECK (frequency_penalty >= -2.0 AND frequency_penalty <= 2.0),
    CONSTRAINT check_presence_penalty CHECK (presence_penalty >= -2.0 AND presence_penalty <= 2.0)
);

-- Indexes
CREATE INDEX idx_genai_config_type ON genai_model_configs(config_type);
CREATE INDEX idx_genai_config_use_case ON genai_model_configs(use_case);
CREATE INDEX idx_genai_config_model ON genai_model_configs(model_identifier);
CREATE INDEX idx_genai_config_active ON genai_model_configs(is_active);
```

### New Table: `genai_request_logs`

Track every GenAI request for analytics and optimization:

```sql
CREATE TABLE genai_request_logs (
    id SERIAL PRIMARY KEY,
    
    -- Request identification
    request_id VARCHAR(100) UNIQUE NOT NULL,
    use_case VARCHAR(50) NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    config_id INTEGER REFERENCES genai_model_configs(id),
    
    -- Request details
    prompt_length INTEGER,
    prompt_hash VARCHAR(64), -- For deduplication
    
    -- Parameters used
    temperature FLOAT,
    max_tokens INTEGER,
    top_p FLOAT,
    
    -- Response details
    response_length INTEGER,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    
    -- Cost tracking
    cost_usd FLOAT,
    
    -- Quality metrics
    confidence_score FLOAT,
    user_feedback INTEGER, -- 1-5 rating
    was_successful BOOLEAN,
    error_message TEXT,
    
    -- Context
    article_id INTEGER REFERENCES articles(id),
    user_id INTEGER REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_genai_log_use_case (use_case),
    INDEX idx_genai_log_model (model_used),
    INDEX idx_genai_log_created (created_at),
    INDEX idx_genai_log_article (article_id)
);
```

---

## 🔧 Implementation

### 1. Enhanced GenAI Provider

```python
# backend/app/genai/config_manager.py

from typing import Dict, Optional, Any
from sqlalchemy.orm import Session
from app.models import GenAIModelConfig
from app.core.logging import logger

class GenAIConfigManager:
    """
    Manages GenAI model configurations with multi-level hierarchy.
    
    Resolution order:
    1. Runtime override (if provided)
    2. Use-case specific config
    3. Model-specific config
    4. Global defaults
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self._cache = {}
    
    def get_config(
        self,
        use_case: str,
        model_identifier: Optional[str] = None,
        runtime_overrides: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Get effective configuration for a GenAI request.
        
        Args:
            use_case: Use case identifier (e.g., 'extraction', 'summarization')
            model_identifier: Model to use (e.g., 'openai:gpt-4')
            runtime_overrides: Runtime parameter overrides
        
        Returns:
            Complete configuration dict with all parameters
        """
        # Start with global defaults
        config = self._get_global_defaults()
        
        # Apply model-specific config if model specified
        if model_identifier:
            model_config = self._get_model_config(model_identifier)
            config.update(model_config)
        
        # Apply use-case specific config
        use_case_config = self._get_use_case_config(use_case)
        config.update(use_case_config)
        
        # If use-case specifies preferred model and no model specified, use it
        if not model_identifier and use_case_config.get('preferred_model'):
            model_identifier = use_case_config['preferred_model']
            model_config = self._get_model_config(model_identifier)
            # Re-apply model config (but don't override use-case settings)
            for key, value in model_config.items():
                if key not in use_case_config:
                    config[key] = value
        
        # Apply runtime overrides (highest priority)
        if runtime_overrides:
            config.update(runtime_overrides)
        
        # Add metadata
        config['_resolved_from'] = {
            'use_case': use_case,
            'model': model_identifier,
            'has_overrides': bool(runtime_overrides)
        }
        
        logger.info("genai_config_resolved",
                   use_case=use_case,
                   model=model_identifier,
                   temperature=config.get('temperature'),
                   max_tokens=config.get('max_tokens'))
        
        return config
    
    def _get_global_defaults(self) -> Dict:
        """Get global default configuration."""
        config = self.db.query(GenAIModelConfig).filter(
            GenAIModelConfig.config_type == 'global',
            GenAIModelConfig.is_active == True,
            GenAIModelConfig.is_default == True
        ).first()
        
        if not config:
            # Hardcoded fallback
            return {
                'temperature': 0.3,
                'max_tokens': 2000,
                'top_p': 0.9,
                'frequency_penalty': 0.0,
                'presence_penalty': 0.0,
                'timeout_seconds': 30,
                'retry_attempts': 3
            }
        
        return self._config_to_dict(config)
    
    def _get_model_config(self, model_identifier: str) -> Dict:
        """Get model-specific configuration."""
        config = self.db.query(GenAIModelConfig).filter(
            GenAIModelConfig.config_type == 'model',
            GenAIModelConfig.model_identifier == model_identifier,
            GenAIModelConfig.is_active == True
        ).first()
        
        return self._config_to_dict(config) if config else {}
    
    def _get_use_case_config(self, use_case: str) -> Dict:
        """Get use-case specific configuration."""
        config = self.db.query(GenAIModelConfig).filter(
            GenAIModelConfig.config_type == 'use_case',
            GenAIModelConfig.use_case == use_case,
            GenAIModelConfig.is_active == True
        ).first()
        
        return self._config_to_dict(config) if config else {}
    
    def _config_to_dict(self, config: GenAIModelConfig) -> Dict:
        """Convert config model to dict."""
        if not config:
            return {}
        
        return {
            'temperature': config.temperature,
            'max_tokens': config.max_tokens,
            'top_p': config.top_p,
            'frequency_penalty': config.frequency_penalty,
            'presence_penalty': config.presence_penalty,
            'stop_sequences': config.stop_sequences or [],
            'timeout_seconds': config.timeout_seconds,
            'retry_attempts': config.retry_attempts,
            'preferred_model': config.preferred_model,
            'max_cost_per_request': config.max_cost_per_request,
            'fallback_model': config.fallback_model
        }
    
    def log_request(
        self,
        use_case: str,
        model_used: str,
        config_used: Dict,
        response_data: Dict,
        article_id: Optional[int] = None,
        user_id: Optional[int] = None
    ):
        """Log GenAI request for analytics."""
        from app.models import GenAIRequestLog
        import hashlib
        
        prompt = response_data.get('prompt', '')
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
        
        log = GenAIRequestLog(
            request_id=response_data.get('request_id'),
            use_case=use_case,
            model_used=model_used,
            prompt_length=len(prompt),
            prompt_hash=prompt_hash,
            temperature=config_used.get('temperature'),
            max_tokens=config_used.get('max_tokens'),
            top_p=config_used.get('top_p'),
            response_length=len(response_data.get('response', '')),
            tokens_used=response_data.get('tokens_used'),
            response_time_ms=response_data.get('response_time_ms'),
            cost_usd=response_data.get('cost_usd'),
            was_successful=response_data.get('success', True),
            error_message=response_data.get('error'),
            article_id=article_id,
            user_id=user_id
        )
        
        self.db.add(log)
        self.db.commit()
```

### 2. Updated GenAI Provider

```python
# backend/app/genai/provider.py (updated)

from app.genai.config_manager import GenAIConfigManager

class GenAIProvider:
    """Enhanced GenAI provider with configuration management."""
    
    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        db_session: Optional[Session] = None
    ):
        self.provider = provider or settings.GENAI_PRIMARY_PROVIDER
        self.model = model
        self.db = db_session
        self.config_manager = GenAIConfigManager(db_session) if db_session else None
    
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        use_case: str = "general",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        Generate response with configuration management.
        
        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            use_case: Use case identifier for config lookup
            temperature: Optional override
            max_tokens: Optional override
            **kwargs: Additional overrides
        """
        # Build runtime overrides
        runtime_overrides = {}
        if temperature is not None:
            runtime_overrides['temperature'] = temperature
        if max_tokens is not None:
            runtime_overrides['max_tokens'] = max_tokens
        runtime_overrides.update(kwargs)
        
        # Get effective configuration
        if self.config_manager:
            config = self.config_manager.get_config(
                use_case=use_case,
                model_identifier=f"{self.provider}:{self.model}" if self.model else None,
                runtime_overrides=runtime_overrides
            )
        else:
            # Fallback to defaults
            config = {
                'temperature': temperature or 0.3,
                'max_tokens': max_tokens or 2000,
                'top_p': kwargs.get('top_p', 0.9)
            }
        
        # Generate response
        start_time = datetime.utcnow()
        
        try:
            response = await self._call_provider(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                config=config
            )
            
            response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            # Log request
            if self.config_manager:
                self.config_manager.log_request(
                    use_case=use_case,
                    model_used=f"{self.provider}:{self.model}",
                    config_used=config,
                    response_data={
                        'request_id': str(uuid.uuid4()),
                        'prompt': user_prompt,
                        'response': response,
                        'tokens_used': len(response.split()),  # Approximate
                        'response_time_ms': response_time_ms,
                        'success': True
                    }
                )
            
            return response
            
        except Exception as e:
            # Log error
            if self.config_manager:
                self.config_manager.log_request(
                    use_case=use_case,
                    model_used=f"{self.provider}:{self.model}",
                    config_used=config,
                    response_data={
                        'request_id': str(uuid.uuid4()),
                        'prompt': user_prompt,
                        'success': False,
                        'error': str(e)
                    }
                )
            raise
```

### 3. Use-Case Specific Helpers

```python
# backend/app/genai/use_cases.py

class GenAIUseCases:
    """Pre-configured GenAI use cases."""
    
    # Use case identifiers
    EXTRACTION = "extraction"
    SUMMARIZATION = "summarization"
    HUNT_GENERATION = "hunt_generation"
    CHATBOT = "chatbot"
    DETECTION_RULE = "detection_rule"
    THREAT_ANALYSIS = "threat_analysis"
    
    @staticmethod
    async def extract_intelligence(
        text: str,
        db_session: Session,
        **overrides
    ) -> Dict:
        """Extract intelligence with optimized config."""
        provider = GenAIProvider(db_session=db_session)
        
        # This will use 'extraction' use-case config
        # (low temperature, high precision)
        response = await provider.generate(
            system_prompt="Extract IOCs and TTPs...",
            user_prompt=text,
            use_case=GenAIUseCases.EXTRACTION,
            **overrides
        )
        
        return parse_extraction_response(response)
    
    @staticmethod
    async def generate_summary(
        text: str,
        summary_type: str,
        db_session: Session,
        **overrides
    ) -> str:
        """Generate summary with optimized config."""
        provider = GenAIProvider(db_session=db_session)
        
        # This will use 'summarization' use-case config
        # (medium temperature, moderate length)
        response = await provider.generate(
            system_prompt=f"Generate {summary_type} summary...",
            user_prompt=text,
            use_case=GenAIUseCases.SUMMARIZATION,
            **overrides
        )
        
        return response
    
    @staticmethod
    async def generate_hunt_query(
        entities: Dict,
        platform: str,
        db_session: Session,
        **overrides
    ) -> str:
        """Generate hunt query with optimized config."""
        provider = GenAIProvider(db_session=db_session)
        
        # This will use 'hunt_generation' use-case config
        # (low temperature, high precision, longer output)
        response = await provider.generate(
            system_prompt=f"Generate {platform} hunt query...",
            user_prompt=json.dumps(entities),
            use_case=GenAIUseCases.HUNT_GENERATION,
            **overrides
        )
        
        return response
```

---

## 🎨 Admin UI Components

### 1. Configuration Management Page

**Route:** `/admin/genai/configurations`

```javascript
// GenAIConfigManager.js

import React, { useState, useEffect } from 'react';

const GenAIConfigManager = () => {
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [useCases] = useState([
    'extraction',
    'summarization',
    'hunt_generation',
    'chatbot',
    'detection_rule',
    'threat_analysis'
  ]);
  
  const loadConfigs = async () => {
    const response = await fetch('/api/admin/genai/configs');
    const data = await response.json();
    setConfigs(data.configs);
  };
  
  return (
    <div className="genai-config-manager">
      <h2>GenAI Model Configuration</h2>
      
      {/* Configuration List */}
      <div className="config-list">
        <h3>Configurations</h3>
        {configs.map(config => (
          <div key={config.id} className="config-item">
            <h4>{config.config_name}</h4>
            <span className="badge">{config.config_type}</span>
            {config.use_case && <span className="badge">{config.use_case}</span>}
            <button onClick={() => setSelectedConfig(config)}>Edit</button>
          </div>
        ))}
        <button onClick={() => setSelectedConfig({})}>Add New</button>
      </div>
      
      {/* Configuration Editor */}
      {selectedConfig && (
        <div className="config-editor">
          <h3>{selectedConfig.id ? 'Edit' : 'Create'} Configuration</h3>
          
          <form>
            <div className="form-group">
              <label>Configuration Name</label>
              <input type="text" value={selectedConfig.config_name || ''} />
            </div>
            
            <div className="form-group">
              <label>Type</label>
              <select value={selectedConfig.config_type || 'use_case'}>
                <option value="global">Global Defaults</option>
                <option value="model">Model-Specific</option>
                <option value="use_case">Use-Case Specific</option>
              </select>
            </div>
            
            {selectedConfig.config_type === 'use_case' && (
              <div className="form-group">
                <label>Use Case</label>
                <select value={selectedConfig.use_case || ''}>
                  {useCases.map(uc => (
                    <option key={uc} value={uc}>{uc}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-group">
              <label>Temperature (0.0 - 2.0)</label>
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1"
                value={selectedConfig.temperature || 0.3}
              />
              <span>{selectedConfig.temperature || 0.3}</span>
            </div>
            
            <div className="form-group">
              <label>Max Tokens</label>
              <input 
                type="number" 
                value={selectedConfig.max_tokens || 2000}
              />
            </div>
            
            <div className="form-group">
              <label>Top P (0.0 - 1.0)</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={selectedConfig.top_p || 0.9}
              />
              <span>{selectedConfig.top_p || 0.9}</span>
            </div>
            
            <div className="form-group">
              <label>Preferred Model</label>
              <select value={selectedConfig.preferred_model || ''}>
                <option value="">None</option>
                <option value="openai:gpt-4">OpenAI GPT-4</option>
                <option value="openai:gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
                <option value="ollama:llama3">Ollama Llama 3</option>
                <option value="anthropic:claude-3">Anthropic Claude 3</option>
              </select>
            </div>
            
            <button type="submit">Save Configuration</button>
          </form>
        </div>
      )}
    </div>
  );
};
```

### 2. Performance Analytics Dashboard

```javascript
// GenAIAnalytics.js

const GenAIAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    loadAnalytics();
  }, []);
  
  const loadAnalytics = async () => {
    const response = await fetch('/api/admin/genai/analytics');
    const data = await response.json();
    setAnalytics(data);
  };
  
  return (
    <div className="genai-analytics">
      <h2>GenAI Performance Analytics</h2>
      
      {/* By Use Case */}
      <div className="analytics-section">
        <h3>Performance by Use Case</h3>
        <table>
          <thead>
            <tr>
              <th>Use Case</th>
              <th>Requests</th>
              <th>Avg Response Time</th>
              <th>Avg Tokens</th>
              <th>Avg Cost</th>
              <th>Success Rate</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.by_use_case.map(uc => (
              <tr key={uc.use_case}>
                <td>{uc.use_case}</td>
                <td>{uc.total_requests}</td>
                <td>{uc.avg_response_time_ms}ms</td>
                <td>{uc.avg_tokens_used}</td>
                <td>${uc.avg_cost_per_request}</td>
                <td>{uc.success_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Cost Breakdown */}
      <div className="analytics-section">
        <h3>Cost Analysis</h3>
        <div className="cost-chart">
          {/* Chart showing cost trends */}
        </div>
      </div>
      
      {/* Model Comparison */}
      <div className="analytics-section">
        <h3>Model Comparison</h3>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Requests</th>
              <th>Avg Quality</th>
              <th>Avg Speed</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.by_model.map(model => (
              <tr key={model.model}>
                <td>{model.model}</td>
                <td>{model.total_requests}</td>
                <td>{model.avg_quality_score}/5</td>
                <td>{model.avg_response_time_ms}ms</td>
                <td>${model.total_cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## 📊 Default Configurations

### Recommended Settings

```python
# Default configurations to seed

CONFIGS = [
    # Global defaults
    {
        "config_name": "global_defaults",
        "config_type": "global",
        "temperature": 0.3,
        "max_tokens": 2000,
        "top_p": 0.9,
        "is_default": True
    },
    
    # Extraction (high precision)
    {
        "config_name": "extraction_default",
        "config_type": "use_case",
        "use_case": "extraction",
        "temperature": 0.1,
        "max_tokens": 2000,
        "top_p": 0.9,
        "preferred_model": "openai:gpt-4"
    },
    
    # Summarization (balanced)
    {
        "config_name": "summarization_default",
        "config_type": "use_case",
        "use_case": "summarization",
        "temperature": 0.3,
        "max_tokens": 500,
        "top_p": 0.95,
        "preferred_model": "openai:gpt-3.5-turbo"
    },
    
    # Hunt generation (high precision, longer output)
    {
        "config_name": "hunt_generation_default",
        "config_type": "use_case",
        "use_case": "hunt_generation",
        "temperature": 0.2,
        "max_tokens": 3000,
        "top_p": 0.85,
        "preferred_model": "openai:gpt-4"
    },
    
    # Chatbot (conversational)
    {
        "config_name": "chatbot_default",
        "config_type": "use_case",
        "use_case": "chatbot",
        "temperature": 0.7,
        "max_tokens": 1000,
        "top_p": 0.9,
        "preferred_model": "ollama:llama3"
    }
]
```

---

## 🎯 Benefits

### 1. Cost Optimization

- Use expensive models (GPT-4) only for critical tasks
- Use cheaper models (GPT-3.5) for bulk operations
- Set token limits per use case
- Track and optimize spending

### 2. Quality Optimization

- Fine-tune temperature for each task
- Optimize for precision vs creativity
- A/B test different settings
- Learn from performance data

### 3. Flexibility

- Change settings without code deployment
- Test new models easily
- Adapt to changing requirements
- Support multiple providers

### 4. Observability

- Track performance per use case
- Monitor costs in real-time
- Identify optimization opportunities
- Debug quality issues

---

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure (1 week)

- [ ] Create database tables
- [ ] Implement GenAIConfigManager
- [ ] Update GenAIProvider
- [ ] Add request logging

### Phase 2: API Endpoints (3 days)

- [ ] CRUD endpoints for configs
- [ ] Analytics endpoints
- [ ] Testing endpoints

### Phase 3: Admin UI (1 week)

- [ ] Configuration manager page
- [ ] Analytics dashboard
- [ ] A/B testing interface

### Phase 4: Migration & Testing (3 days)

- [ ] Migrate existing code
- [ ] Seed default configs
- [ ] Test all use cases
- [ ] Performance testing

---

## 📈 Success Metrics

- **Cost Reduction:** Target 30% reduction through optimization
- **Quality Improvement:** Target 20% improvement in extraction accuracy
- **Response Time:** Target 15% improvement through model selection
- **Admin Satisfaction:** Easy configuration without code changes

---

## ✅ Recommendation

**YES, absolutely implement this!**

This is a high-value feature that will:
1. ✅ Reduce costs significantly
2. ✅ Improve quality through optimization
3. ✅ Increase flexibility
4. ✅ Enable data-driven decisions
5. ✅ Support scaling

**Priority:** HIGH  
**Effort:** Medium (2-3 weeks)  
**Value:** Very High

---

**Status:** 📋 **READY FOR IMPLEMENTATION**
