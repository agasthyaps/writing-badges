# Writing Badges 🏆

A gamified creative writing application that challenges writers to earn mystery badges through creative expression. Players must discover hidden criteria by experimenting with different writing techniques and styles.

## What is Writing Badges?

Writing Badges is an interactive creative writing game where players:

1. **Receive a writing prompt** (e.g., "write a poem", "tell a story", "describe a scene")
2. **See three mystery badges** with only names and emojis visible (e.g., 🌈 Metaphor, 🍊 Tangerine, 🔊 Sound)
3. **Write and submit** creative pieces to try to earn all badges
4. **Discover criteria** as they earn badges and receive feedback
5. **Use assists** (AI-generated hints) when they get stuck
6. **Complete the challenge** by writing something that earns all three badges simultaneously

The game encourages experimentation, creativity, and iterative improvement in writing while maintaining an element of mystery and discovery.

## How to Play

### Getting Started
1. Read the writing prompt (e.g., "write a poem")
2. Observe the three mystery badges - you can see their names and emojis but not their criteria
3. Write something you think might earn one or more badges
4. Submit your writing to see which badges you've earned

### Game Mechanics
- **Badge Scoring**: Each badge can be unearned (0), half-earned (1), or fully earned (2)
- **Assists**: Earn assists by discovering badge criteria - use them to get AI-generated hints that add lines to your writing
- **Feedback**: Receive personalized, cryptic feedback after each submission to guide your next attempt
- **Clues**: After 3 unsuccessful attempts, receive direct clues about unearned badges
- **Victory**: Win by writing something that earns all three badges at once

### Tips for Success
- Experiment with different writing techniques and styles
- Pay attention to badge names and emojis for hints about their criteria
- Use assists strategically when you're stuck
- Read feedback carefully - it contains subtle guidance
- Don't be afraid to try unusual or creative approaches

## Pedagogical Value

### Learning Objectives
Writing Badges serves multiple educational purposes:

**Creative Writing Skills**
- **Experimentation**: Encourages writers to try different techniques, styles, and approaches
- **Revision and Iteration**: Promotes multiple drafts and continuous improvement
- **Genre Flexibility**: Adapts to various writing forms (poetry, narrative, descriptive writing)
- **Creative Problem-Solving**: Challenges writers to think creatively about meeting unknown criteria

**Critical Thinking**
- **Pattern Recognition**: Players must identify what makes writing successful through trial and error
- **Analysis**: Encourages close reading of feedback and self-reflection on writing choices
- **Hypothesis Testing**: Writers develop and test theories about badge criteria

**Engagement and Motivation**
- **Gamification**: Badge system and mystery elements increase engagement
- **Low Stakes**: Encourages risk-taking and experimentation without fear of failure
- **Immediate Feedback**: AI evaluation provides instant, personalized responses
- **Scaffolded Support**: Assist system provides help when needed without being intrusive

### Educational Applications

**Classroom Use**
- **Writing Warm-ups**: Quick, engaging activities to start writing sessions
- **Skill Building**: Target specific writing techniques through custom badge criteria
- **Peer Learning**: Students can discuss strategies and share discoveries
- **Assessment Alternative**: Formative assessment tool that focuses on process over product

**Individual Practice**
- **Daily Writing**: Encourages regular, low-pressure writing practice
- **Skill Development**: Helps writers discover and develop new techniques
- **Creative Confidence**: Builds confidence through experimentation and success

**Professional Development**
- **Teacher Training**: Demonstrates gamified approaches to writing instruction
- **Curriculum Design**: Model for creating engaging, discovery-based learning experiences

## Technical Architecture

### Frontend (React + Vite)
- Modern React application with Tailwind CSS styling
- Real-time interaction with writing interface
- Social sharing capabilities with generated image cards
- Responsive design for desktop and mobile

### Backend (FastAPI)
- RESTful API handling writing evaluation and badge generation
- Multi-LLM integration (OpenAI GPT, Anthropic Claude, Google Gemini)
- Dynamic badge creation system
- Image generation for social sharing
- Real-time hint and feedback generation

### AI Integration
- **Badge Generation**: AI creates diverse, creative badge criteria for each session
- **Writing Evaluation**: Sophisticated scoring system that rewards creativity and effort
- **Hint System**: Context-aware assistance that adds lines to existing writing
- **Feedback Generation**: Personalized, encouraging feedback with subtle guidance

## Setup and Installation

### Prerequisites
- Node.js 16+ and npm/yarn
- Python 3.8+
- API keys for OpenAI, Anthropic, and Google Gemini

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY=your_openai_key
export ANTHROPIC_API_KEY=your_anthropic_key
export GEMINI_API_KEY=your_gemini_key

# Run the server
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install

# Set environment variables (optional)
export VITE_API_URL=http://localhost:8000

# Run development server
npm run dev
```

### Production Deployment
The application is configured for deployment on:
- **Backend**: Railway (FastAPI)
- **Frontend**: Vercel (React)
- **CORS**: Configured for cross-origin requests

## Contributing

Writing Badges is designed to be extensible and customizable:

- **Badge Criteria**: Modify prompts in `backend/prompts.py` to create different types of badges
- **Writing Prompts**: Add new prompt types in `backend/app.py`
- **UI/UX**: Customize the interface in `frontend/src/App.jsx`
- **AI Models**: Adjust model selection and parameters in `backend/llm_utils.py`

## Credits

Created by [Agasthya Shenoy](https://www.teachinglabstudio.com/team/agasthya-shenoy) at [Teaching Lab Studio](https://teachinglabstudio.com).

## License

This project is open source and available under the MIT License.
