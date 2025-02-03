# PyZone

## Demo Video

[Watch the demo video](https://www.youtube.com/watch?v=WXS5yx0vgzM&ab_channel=BenjamAlander)
<img width="1433" alt="pyzone" src="https://github.com/user-attachments/assets/be17c694-fd35-418e-a8f1-fb43c8f98a76" />

A learning application that integrates OpenAI and Supabase for enhanced programming education.

## Prerequisites

- [Node.js](https://nodejs.org/)
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Supabase](https://supabase.com/) project with API credentials

## Setup

1. Clone the repository
2. Create a `.env` file in the root directory with the following keys:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_URL=your_supabase_project_url_here
```

You can get these credentials from:
- OpenAI API Key: [OpenAI Platform](https://platform.openai.com/api-keys)
- Supabase Keys: [Supabase Dashboard](https://supabase.com/dashboard) under Project Settings > API

## Installation

```bash
npm install
```

## Running the Application

```bash
npm run dev
```

The application will start on `http://localhost:5173` (or another port if 5173 is occupied).

## Links

- [OpenAI Documentation](https://platform.openai.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
