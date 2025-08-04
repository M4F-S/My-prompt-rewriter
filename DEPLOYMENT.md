# Production Deployment Checklist

## Pre-Deployment Verification

### ✅ Model Upgrade Verification
- [ ] Confirmed model changed to `llama-3.3-70b-versatile` in both API endpoints
- [ ] Token counting logic implemented and tested
- [ ] Error handling covers all Groq API error scenarios
- [ ] Retry logic with exponential backoff functioning
- [ ] Health check endpoint responding correctly

### ✅ Environment Configuration
- [ ] `GROQ_API_KEY` set in production environment
- [ ] `SERPAPI_API_KEY` configured (optional)
- [ ] API keys are not hardcoded in source code
- [ ] Environment variables validated in API routes

### ✅ Performance Optimizations
- [ ] Request timeouts set to 30 seconds
- [ ] Token limits validated before API calls
- [ ] Comprehensive logging implemented
- [ ] Error messages are user-friendly
- [ ] Graceful degradation for API failures

### ✅ Feature Verification
- [ ] All 7 modes function correctly
- [ ] Framework optimization formatting works
- [ ] Report writing mode enhanced
- [ ] Self-improvement feature operational
- [ ] Web search integration functional
- [ ] Copy to clipboard working
- [ ] Theme switching operational

## Deployment Steps

### Vercel Deployment
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Set environment variables in Vercel dashboard
# GROQ_API_KEY=your-actual-groq-key
# SERPAPI_API_KEY=your-serpapi-key (optional)
```

### Railway Deployment
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up

# 5. Set environment variables
railway variables set GROQ_API_KEY=your-actual-groq-key
railway variables set SERPAPI_API_KEY=your-serpapi-key
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Post-Deployment Verification

### ✅ Health Checks
- [ ] `/api/health` endpoint returns 200 status
- [ ] All services show as healthy
- [ ] Groq API connectivity confirmed
- [ ] Response times within acceptable limits

### ✅ Functionality Tests
- [ ] Test each of the 7 modes
- [ ] Verify framework optimization formatting
- [ ] Test self-improvement feature
- [ ] Confirm web search integration
- [ ] Test error handling scenarios
- [ ] Verify rate limit handling

### ✅ Performance Monitoring
- [ ] Set up monitoring alerts
- [ ] Monitor API response times
- [ ] Track error rates
- [ ] Monitor token usage
- [ ] Set up log aggregation

## Monitoring and Maintenance

### Key Metrics to Monitor
- API response times (target: <5s average)
- Error rates (target: <1%)
- Token usage and costs
- Rate limit hits
- Health check status

### Recommended Monitoring Tools
- Vercel Analytics (for Vercel deployments)
- Sentry for error tracking
- LogRocket for user session replay
- Custom dashboards for API metrics

### Maintenance Tasks
- Weekly review of error logs
- Monthly API usage analysis
- Quarterly dependency updates
- Regular security audits

## Troubleshooting

### Common Issues
1. **Rate Limits**: Implement exponential backoff (already included)
2. **Token Limits**: Monitor prompt lengths and implement truncation
3. **API Timeouts**: Verify network connectivity and API status
4. **Memory Issues**: Monitor memory usage in production

### Emergency Procedures
1. Check health endpoint: `/api/health`
2. Review recent error logs
3. Verify API key validity
4. Check Groq service status
5. Rollback to previous version if needed