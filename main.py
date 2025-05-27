"""
Llama Model Service - Clean Architecture Implementation
This demonstrates the core structure and functionality
"""

import asyncio
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, Any, List
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# DOMAIN LAYER - Core business logic and entities
# ============================================================================

class ModelStatus(Enum):
    NOT_DOWNLOADED = "not_downloaded"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    LOADING = "loading"
    LOADED = "loaded"
    ERROR = "error"

@dataclass
class ModelInfo:
    """Value Object representing model information"""
    name: str
    version: str
    size_gb: float
    url: str
    local_path: str

class Model:
    """Domain Entity representing a Llama model"""
    
    def __init__(self, info: ModelInfo):
        self._info = info
        self._status = ModelStatus.NOT_DOWNLOADED
        self._error_message: Optional[str] = None
    
    @property
    def info(self) -> ModelInfo:
        return self._info
    
    @property
    def status(self) -> ModelStatus:
        return self._status
    
    @property
    def is_ready(self) -> bool:
        return self._status == ModelStatus.LOADED
    
    def mark_downloading(self):
        self._status = ModelStatus.DOWNLOADING
    
    def mark_downloaded(self):
        self._status = ModelStatus.DOWNLOADED
    
    def mark_loading(self):
        self._status = ModelStatus.LOADING
    
    def mark_loaded(self):
        self._status = ModelStatus.LOADED
    
    def mark_error(self, error: str):
        self._status = ModelStatus.ERROR
        self._error_message = error

@dataclass
class GenerationRequest:
    """Value Object for generation requests"""
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7
    top_p: float = 0.9

@dataclass
class GenerationResponse:
    """Value Object for generation responses"""
    text: str
    tokens_used: int
    processing_time: float

# Domain Interfaces (Ports)
class ModelRepository(ABC):
    """Repository interface for model persistence"""
    
    @abstractmethod
    async def get_model(self, name: str) -> Optional[Model]:
        pass
    
    @abstractmethod
    async def save_model(self, model: Model) -> None:
        pass

class ModelDownloader(ABC):
    """Interface for downloading models"""
    
    @abstractmethod
    async def download(self, model_info: ModelInfo) -> bool:
        pass

class ModelLoader(ABC):
    """Interface for loading models into memory"""
    
    @abstractmethod
    async def load_model(self, model: Model) -> bool:
        pass
    
    @abstractmethod
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        pass

# ============================================================================
# APPLICATION LAYER - Use cases and application services
# ============================================================================

class ModelService:
    """Application service orchestrating model operations"""
    
    def __init__(
        self,
        repository: ModelRepository,
        downloader: ModelDownloader,
        loader: ModelLoader
    ):
        self._repository = repository
        self._downloader = downloader
        self._loader = loader
        self._current_model: Optional[Model] = None
    
    async def setup_model(self, model_name: str) -> Dict[str, Any]:
        """Use case: Setup a model (download if needed, then load)"""
        try:
            # Get or create model
            model = await self._repository.get_model(model_name)
            if not model:
                # For demo, create a mock model
                model_info = ModelInfo(
                    name=model_name,
                    version="1.0",
                    size_gb=7.0,
                    url=f"https://example.com/models/{model_name}",
                    local_path=f"./models/{model_name}"
                )
                model = Model(model_info)
            
            # Download if needed
            if model.status == ModelStatus.NOT_DOWNLOADED:
                logger.info(f"Downloading model {model_name}...")
                model.mark_downloading()
                await self._repository.save_model(model)
                
                success = await self._downloader.download(model.info)
                if success:
                    model.mark_downloaded()
                else:
                    model.mark_error("Download failed")
                    await self._repository.save_model(model)
                    return {"success": False, "error": "Download failed"}
            
            # Load model
            if model.status == ModelStatus.DOWNLOADED:
                logger.info(f"Loading model {model_name}...")
                model.mark_loading()
                await self._repository.save_model(model)
                
                success = await self._loader.load_model(model)
                if success:
                    model.mark_loaded()
                    self._current_model = model
                else:
                    model.mark_error("Loading failed")
                    await self._repository.save_model(model)
                    return {"success": False, "error": "Loading failed"}
            
            await self._repository.save_model(model)
            return {
                "success": True,
                "model": model_name,
                "status": model.status.value
            }
            
        except Exception as e:
            logger.error(f"Error setting up model: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Use case: Generate text using the loaded model"""
        if not self._current_model or not self._current_model.is_ready:
            return {"success": False, "error": "No model loaded"}
        
        try:
            request = GenerationRequest(prompt=prompt, **kwargs)
            response = await self._loader.generate(request)
            
            return {
                "success": True,
                "text": response.text,
                "tokens_used": response.tokens_used,
                "processing_time": response.processing_time
            }
        except Exception as e:
            logger.error(f"Error generating text: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Use case: Get current model status"""
        if not self._current_model:
            return {"model": None, "status": "no_model"}
        
        return {
            "model": self._current_model.info.name,
            "status": self._current_model.status.value,
            "ready": self._current_model.is_ready
        }

# ============================================================================
# INFRASTRUCTURE LAYER - External concerns and adapters
# ============================================================================

class InMemoryModelRepository(ModelRepository):
    """In-memory implementation of model repository"""
    
    def __init__(self):
        self._models: Dict[str, Model] = {}
    
    async def get_model(self, name: str) -> Optional[Model]:
        return self._models.get(name)
    
    async def save_model(self, model: Model) -> None:
        self._models[model.info.name] = model

class MockModelDownloader(ModelDownloader):
    """Mock implementation for demonstration"""
    
    async def download(self, model_info: ModelInfo) -> bool:
        logger.info(f"Simulating download of {model_info.name}...")
        await asyncio.sleep(1)  # Simulate download time
        logger.info(f"Download completed for {model_info.name}")
        return True

class MockModelLoader(ModelLoader):
    """Mock implementation for demonstration"""
    
    def __init__(self):
        self._loaded_model: Optional[Model] = None
    
    async def load_model(self, model: Model) -> bool:
        logger.info(f"Simulating loading of {model.info.name}...")
        await asyncio.sleep(1)  # Simulate loading time
        self._loaded_model = model
        logger.info(f"Model {model.info.name} loaded successfully")
        return True
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        if not self._loaded_model:
            raise Exception("No model loaded")
        
        # Simulate text generation
        await asyncio.sleep(0.1)  # Simulate processing time
        
        generated_text = f"Generated response for: '{request.prompt}' (max_tokens: {request.max_tokens})"
        
        return GenerationResponse(
            text=generated_text,
            tokens_used=len(generated_text.split()),
            processing_time=0.1
        )

# ============================================================================
# PRESENTATION LAYER - CLI Interface
# ============================================================================

class CLIInterface:
    """Command Line Interface for the model service"""
    
    def __init__(self, model_service: ModelService):
        self._service = model_service
    
    async def run_interactive(self):
        """Run interactive CLI session"""
        print("🦙 Llama Model Service CLI")
        print("Commands: setup <model>, generate <prompt>, status, quit")
        
        while True:
            try:
                command = input("\n> ").strip()
                
                if command.startswith("setup "):
                    model_name = command[6:].strip()
                    result = await self._service.setup_model(model_name)
                    if result["success"]:
                        print(f"✅ Model {model_name} setup complete")
                    else:
                        print(f"❌ Setup failed: {result['error']}")
                
                elif command.startswith("generate "):
                    prompt = command[9:].strip()
                    result = await self._service.generate_text(prompt)
                    if result["success"]:
                        print(f"🤖 {result['text']}")
                        print(f"📊 Tokens: {result['tokens_used']}, Time: {result['processing_time']:.2f}s")
                    else:
                        print(f"❌ Generation failed: {result['error']}")
                
                elif command == "status":
                    status = await self._service.get_model_status()
                    print(f"📋 Status: {json.dumps(status, indent=2)}")
                
                elif command == "quit":
                    print("👋 Goodbye!")
                    break
                
                else:
                    print("❓ Unknown command. Try: setup <model>, generate <prompt>, status, quit")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

# ============================================================================
# DEPENDENCY INJECTION & MAIN
# ============================================================================

async def create_application() -> ModelService:
    """Factory function to create the application with dependencies"""
    repository = InMemoryModelRepository()
    downloader = MockModelDownloader()
    loader = MockModelLoader()
    
    return ModelService(repository, downloader, loader)

async def main():
    """Main entry point demonstrating the application"""
    print("🚀 Starting Llama Model Service Demo")
    
    # Create application
    service = await create_application()
    
    # Demo the service
    print("\n1. Setting up model 'llama-7b'...")
    result = await service.setup_model("llama-7b")
    print(f"Setup result: {result}")
    
    print("\n2. Checking model status...")
    status = await service.get_model_status()
    print(f"Status: {status}")
    
    print("\n3. Generating text...")
    result = await service.generate_text("What is artificial intelligence?")
    print(f"Generation result: {result}")
    
    print("\n4. Starting CLI interface...")
    cli = CLIInterface(service)
    await cli.run_interactive()

# Run the demo
if __name__ == "__main__":
    asyncio.run(main())
