/**
 * Unified Hunt Launcher Hook
 * 
 * This hook provides consistent hunt generation and execution logic
 * for use across the application (ArticleQueue, Hunts, ArticleDetail, etc.)
 * 
 * It ensures:
 * 1. Consistent API calls for generating and executing hunts
 * 2. Proper status updates for articles
 * 3. Unified response handling including comments on article detail
 * 4. Consistent error handling
 */
import { useState, useCallback } from 'react';
import { message } from 'antd';
import { huntsAPI, articlesAPI } from '../api/client';

export function useHuntLauncher() {
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [lastError, setLastError] = useState(null);

  /**
   * Preview a hunt query without creating/executing it
   */
  const previewQuery = useCallback(async (articleId, platform) => {
    setGenerating(true);
    setLastError(null);
    try {
      const response = await huntsAPI.previewQuery(articleId, platform);
      const query = response.data?.query || response.data?.query_logic || '';
      setLastResult({ type: 'preview', query, platform, model_used: response.data?.model_used });
      return { success: true, query, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to generate query preview';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setGenerating(false);
    }
  }, []);

  /**
   * Generate a hunt query (creates the hunt record)
   */
  const generateHunt = useCallback(async (articleId, platform) => {
    setGenerating(true);
    setLastError(null);
    try {
      const response = await huntsAPI.generateQuery(articleId, platform);
      const huntId = response.data?.id;
      const query = response.data?.query_logic || response.data?.query || '';
      
      setLastResult({ 
        type: 'generated', 
        huntId, 
        query, 
        platform,
        title: response.data?.title,
        model_used: response.data?.generated_by_model 
      });
      
      return { 
        success: true, 
        huntId, 
        query, 
        data: response.data 
      };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to generate hunt';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setGenerating(false);
    }
  }, []);

  /**
   * Execute an existing hunt
   */
  const executeHunt = useCallback(async (huntId) => {
    setExecuting(true);
    setLastError(null);
    try {
      const response = await huntsAPI.execute(huntId);
      
      setLastResult(prev => ({
        ...prev,
        type: 'executed',
        executionId: response.data?.id,
        status: response.data?.status,
        hits_count: response.data?.hits_count,
        results: response.data?.results
      }));
      
      return {
        success: true,
        executionId: response.data?.id,
        status: response.data?.status,
        data: response.data
      };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to execute hunt';
      setLastError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setExecuting(false);
    }
  }, []);

  /**
   * Update hunt with custom query before execution
   */
  const updateHuntQuery = useCallback(async (huntId, newQuery) => {
    try {
      await huntsAPI.update(huntId, { query_logic: newQuery });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update hunt query';
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Generate and immediately execute a hunt
   * This is the most common use case
   */
  const generateAndExecute = useCallback(async (articleId, platform, options = {}) => {
    const { 
      customQuery = null,
      updateArticleStatus = true,
      showMessages = true,
      addCommentOnComplete = false 
    } = options;

    // Step 1: Generate hunt
    const genResult = await generateHunt(articleId, platform);
    if (!genResult.success) {
      if (showMessages) message.error(genResult.error);
      return { success: false, error: genResult.error, step: 'generate' };
    }

    const huntId = genResult.huntId;

    // Step 2: Update query if custom provided
    if (customQuery && customQuery !== genResult.query) {
      const updateResult = await updateHuntQuery(huntId, customQuery);
      if (!updateResult.success) {
        if (showMessages) message.warning('Hunt created but custom query update failed');
      }
    }

    // Step 3: Execute hunt
    const execResult = await executeHunt(huntId);
    if (!execResult.success) {
      if (showMessages) message.error(execResult.error);
      return { 
        success: false, 
        error: execResult.error, 
        step: 'execute',
        huntId 
      };
    }

    // Step 4: Update article status
    if (updateArticleStatus) {
      try {
        await articlesAPI.updateStatus(articleId, 'HUNT_GENERATED');
      } catch (statusErr) {
        console.error('Failed to update article status', statusErr);
        // Don't fail the overall operation for this
      }
    }

    // Step 5: Add comment to article (optional)
    if (addCommentOnComplete) {
      try {
        const statusText = execResult.status === 'COMPLETED' 
          ? (execResult.data?.hits_count > 0 
              ? `Hunt completed with ${execResult.data.hits_count} hits found!` 
              : 'Hunt completed with no hits.')
          : execResult.status === 'FAILED'
            ? `Hunt failed: ${execResult.data?.error_message || 'Unknown error'}`
            : `Hunt status: ${execResult.status}`;
        
        await articlesAPI.addComment(
          articleId, 
          `[Auto] ${platform.toUpperCase()} hunt executed. ${statusText}`,
          true // internal comment
        );
      } catch (commentErr) {
        console.error('Failed to add hunt result comment', commentErr);
      }
    }

    if (showMessages) {
      message.success('Hunt launched successfully! Check Hunt Executions for results.');
    }

    return {
      success: true,
      huntId,
      executionId: execResult.executionId,
      status: execResult.status,
      data: execResult.data
    };
  }, [generateHunt, executeHunt, updateHuntQuery]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setLastResult(null);
    setLastError(null);
  }, []);

  return {
    // State
    generating,
    executing,
    loading: generating || executing,
    lastResult,
    lastError,
    
    // Actions
    previewQuery,
    generateHunt,
    executeHunt,
    updateHuntQuery,
    generateAndExecute,
    reset
  };
}

export default useHuntLauncher;
