/**
 * Template Editor Component
 *
 * Editor for creating and modifying templates
 */

import React, { useState, useEffect } from 'react';
import { Template, TemplateEditorProps, TemplateCategory } from './types';
import { validateTemplate } from './utils';

/**
 * TemplateEditor Component
 */
export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  readOnly = false,
  className = ''
}) => {
  const [name, setName] = useState(template?.metadata.name || '');
  const [description, setDescription] = useState(template?.metadata.description || '');
  const [category, setCategory] = useState<TemplateCategory>(
    template?.metadata.category || TemplateCategory.CUSTOM
  );
  const [tags, setTags] = useState<string[]>(template?.metadata.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    template?.metadata.difficulty || 'beginner'
  );
  const [estimatedTime, setEstimatedTime] = useState(template?.metadata.estimatedTime || 15);
  const [errors, setErrors] = useState<string[]>([]);

  /**
   * Add tag
   */
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  /**
   * Remove tag
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  /**
   * Handle tag input key press
   */
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (!name.trim()) {
      validationErrors.push('Name is required');
    }
    if (!description.trim()) {
      validationErrors.push('Description is required');
    }
    if (tags.length === 0) {
      validationErrors.push('At least one tag is required');
    }
    if (estimatedTime < 1) {
      validationErrors.push('Estimated time must be at least 1 minute');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const newTemplate: Template = template || {
      metadata: {
        id: `template-${Date.now()}`,
        name: '',
        description: '',
        author: {
          name: 'Current User',
          id: 'current-user',
          avatar: '👤'
        },
        category: TemplateCategory.CUSTOM,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        rating: 0,
        ratingCount: 0,
        difficulty: 'beginner',
        estimatedTime: 15,
        featured: false,
        verified: false
      },
      sheets: [
        {
          name: 'Sheet1',
          cells: [],
          dimensions: { rows: 100, columns: 26 }
        }
      ],
      config: {
        autoStartAgents: false,
        requiredPermissions: []
      }
    };

    // Update metadata
    newTemplate.metadata = {
      ...newTemplate.metadata,
      name: name.trim(),
      description: description.trim(),
      category,
      tags,
      difficulty,
      estimatedTime,
      updatedAt: Date.now()
    };

    // Validate template structure
    const validation = validateTemplate(newTemplate);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave(newTemplate);
  };

  return (
    <div className={`template-editor-modal ${className}`}>
      <div className="template-editor-backdrop" onClick={onCancel} />
      <div className="template-editor-content">
        {/* Header */}
        <div className="template-editor-header">
          <h2>{template ? 'Edit Template' : 'Create Template'}</h2>
          <button className="close-button" onClick={onCancel}>
            ×
          </button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="template-editor-errors">
            {errors.map((error, index) => (
              <div key={index} className="error-item">
                ⚠️ {error}
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="template-editor-form">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="template-name">Template Name *</label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter template name"
              disabled={readOnly}
              className="form-input"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="template-description">Description *</label>
            <textarea
              id="template-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what this template does"
              disabled={readOnly}
              rows={4}
              className="form-textarea"
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="template-category">Category</label>
            <select
              id="template-category"
              value={category}
              onChange={e => setCategory(e.target.value as TemplateCategory)}
              disabled={readOnly}
              className="form-select"
            >
              <option value={TemplateCategory.DATA_ANALYSIS}>📊 Data Analysis</option>
              <option value={TemplateCategory.AUTOMATION}>⚙️ Automation</option>
              <option value={TemplateCategory.REPORTING}>📈 Reporting</option>
              <option value={TemplateCategory.FINANCE}>💰 Finance</option>
              <option value={TemplateCategory.PROJECT_MANAGEMENT}>📋 Project Management</option>
              <option value={TemplateCategory.INTEGRATION}>🔌 Integration</option>
              <option value={TemplateCategory.MACHINE_LEARNING}>🤖 Machine Learning</option>
              <option value={TemplateCategory.CUSTOM}>✨ Custom</option>
            </select>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label htmlFor="template-tags">Tags *</label>
            <div className="tags-input-container">
              <div className="tags-list">
                {tags.map(tag => (
                  <span key={tag} className="tag-item">
                    {tag}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {!readOnly && (
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    placeholder="Add a tag and press Enter"
                    className="form-input"
                  />
                  <button type="button" onClick={handleAddTag} className="button secondary">
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Difficulty */}
          <div className="form-group">
            <label htmlFor="template-difficulty">Difficulty Level</label>
            <select
              id="template-difficulty"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as any)}
              disabled={readOnly}
              className="form-select"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Estimated Time */}
          <div className="form-group">
            <label htmlFor="template-time">Estimated Setup Time (minutes)</label>
            <input
              id="template-time"
              type="number"
              value={estimatedTime}
              onChange={e => setEstimatedTime(parseInt(e.target.value) || 1)}
              min={1}
              max={120}
              disabled={readOnly}
              className="form-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="template-editor-footer">
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          {!readOnly && (
            <button className="button primary" onClick={handleSave}>
              Save Template
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
