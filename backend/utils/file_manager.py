"""
파일 관리 시스템
이미지 업로드, 파일 첨부, 썸네일 생성, 보안 검증을 제공합니다.
"""

import os
import uuid
import hashlib
import mimetypes
from datetime import datetime
from PIL import Image
from werkzeug.utils import secure_filename
try:
    import magic
except ImportError:
    # python-magic이 설치되지 않은 경우 대체 (Windows, Render 등)
    magic = None
    print("[INFO] python-magic이 설치되지 않아 mimetypes를 사용합니다.")

class FileManager:
    """파일 관리 클래스"""

    def __init__(self, upload_folder='uploads', max_file_size=10*1024*1024):  # 10MB
        self.upload_folder = upload_folder
        self.max_file_size = max_file_size
        self.allowed_extensions = {
            'image': {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'},
            'document': {'.pdf', '.doc', '.docx', '.txt', '.rtf'},
            'video': {'.mp4', '.avi', '.mov', '.wmv', '.flv'},
            'audio': {'.mp3', '.wav', '.ogg', '.aac', '.m4a'},
            'archive': {'.zip', '.rar', '.7z', '.tar', '.gz'}
        }
        self.allowed_mime_types = {
            'image': {'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'},
            'document': {'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'},
            'video': {'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv'},
            'audio': {'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4'},
            'archive': {'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'}
        }

        # 업로드 폴더 생성
        self._create_upload_folders()

    def _create_upload_folders(self):
        """업로드 폴더 구조 생성"""
        folders = [
            self.upload_folder,
            os.path.join(self.upload_folder, 'images'),
            os.path.join(self.upload_folder, 'images', 'thumbnails'),
            os.path.join(self.upload_folder, 'documents'),
            os.path.join(self.upload_folder, 'videos'),
            os.path.join(self.upload_folder, 'audio'),
            os.path.join(self.upload_folder, 'archives'),
            os.path.join(self.upload_folder, 'temp')
        ]

        for folder in folders:
            os.makedirs(folder, exist_ok=True)

    def _get_file_type(self, filename, mime_type):
        """파일 타입 결정"""
        ext = os.path.splitext(filename)[1].lower()

        for file_type, extensions in self.allowed_extensions.items():
            if ext in extensions and mime_type in self.allowed_mime_types.get(file_type, set()):
                return file_type

        return 'unknown'

    def _generate_unique_filename(self, original_filename):
        """고유한 파일명 생성"""
        ext = os.path.splitext(original_filename)[1].lower()
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{timestamp}_{unique_id}{ext}"

    def _validate_file(self, file, file_type):
        """파일 유효성 검증"""
        # 파일 크기 검증
        if len(file.read()) > self.max_file_size:
            file.seek(0)  # 파일 포인터 리셋
            return False, "파일 크기가 너무 큽니다. (최대 10MB)"

        file.seek(0)  # 파일 포인터 리셋

        # MIME 타입 검증
        try:
            if magic:
                mime_type = magic.from_buffer(file.read(1024), mime=True)
            else:
                # magic 모듈이 없는 경우 mimetypes 사용
                file.seek(0)
                mime_type, _ = mimetypes.guess_type(file.filename)
                if not mime_type:
                    mime_type = 'application/octet-stream'
            file.seek(0)

            if file_type == 'image' and mime_type not in self.allowed_mime_types['image']:
                return False, "지원하지 않는 이미지 형식입니다."
            elif file_type == 'document' and mime_type not in self.allowed_mime_types['document']:
                return False, "지원하지 않는 문서 형식입니다."
            elif file_type == 'video' and mime_type not in self.allowed_mime_types['video']:
                return False, "지원하지 않는 비디오 형식입니다."
            elif file_type == 'audio' and mime_type not in self.allowed_mime_types['audio']:
                return False, "지원하지 않는 오디오 형식입니다."
            elif file_type == 'archive' and mime_type not in self.allowed_mime_types['archive']:
                return False, "지원하지 않는 압축 파일 형식입니다."

        except Exception as e:
            return False, f"파일 검증 중 오류가 발생했습니다: {str(e)}"

        return True, "파일이 유효합니다."

    def _create_thumbnail(self, image_path, thumbnail_path, size=(200, 200)):
        """이미지 썸네일 생성"""
        try:
            with Image.open(image_path) as img:
                # 이미지 회전 정보 처리
                if hasattr(img, '_getexif'):
                    exif = img._getexif()
                    if exif is not None:
                        orientation = exif.get(0x0112)
                        if orientation == 3:
                            img = img.rotate(180, expand=True)
                        elif orientation == 6:
                            img = img.rotate(270, expand=True)
                        elif orientation == 8:
                            img = img.rotate(90, expand=True)

                # 썸네일 생성
                img.thumbnail(size, Image.Resampling.LANCZOS)

                # RGB 모드로 변환 (PNG 투명도 처리)
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background

                img.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
                return True
        except Exception as e:
            print(f"썸네일 생성 실패: {e}")
            return False

    def upload_file(self, file, file_type='image', user_id=None):
        """파일 업로드"""
        try:
            # 파일명 보안 처리
            original_filename = secure_filename(file.filename)
            if not original_filename:
                return None, "유효하지 않은 파일명입니다."

            # 파일 유효성 검증
            is_valid, message = self._validate_file(file, file_type)
            if not is_valid:
                return None, message

            # 고유한 파일명 생성
            unique_filename = self._generate_unique_filename(original_filename)

            # 파일 타입별 저장 경로 결정
            if file_type == 'image':
                save_path = os.path.join(self.upload_folder, 'images', unique_filename)
                thumbnail_path = os.path.join(self.upload_folder, 'images', 'thumbnails', f"thumb_{unique_filename}")
            elif file_type == 'document':
                save_path = os.path.join(self.upload_folder, 'documents', unique_filename)
                thumbnail_path = None
            elif file_type == 'video':
                save_path = os.path.join(self.upload_folder, 'videos', unique_filename)
                thumbnail_path = None
            elif file_type == 'audio':
                save_path = os.path.join(self.upload_folder, 'audio', unique_filename)
                thumbnail_path = None
            elif file_type == 'archive':
                save_path = os.path.join(self.upload_folder, 'archives', unique_filename)
                thumbnail_path = None
            else:
                return None, "지원하지 않는 파일 타입입니다."

            # 파일 저장
            file.save(save_path)

            # 파일 해시 생성
            file_hash = self._generate_file_hash(save_path)

            # 이미지인 경우 썸네일 생성
            if file_type == 'image' and thumbnail_path:
                self._create_thumbnail(save_path, thumbnail_path)

            # 파일 메타데이터 생성
            file_metadata = {
                'original_filename': original_filename,
                'unique_filename': unique_filename,
                'file_path': save_path,
                'thumbnail_path': thumbnail_path,
                'file_size': os.path.getsize(save_path),
                'file_type': file_type,
                'mime_type': mimetypes.guess_type(save_path)[0],
                'file_hash': file_hash,
                'uploaded_by': user_id,
                'uploaded_at': datetime.utcnow().isoformat(),
                'is_processed': True
            }

            return file_metadata, "파일이 성공적으로 업로드되었습니다."

        except Exception as e:
            return None, f"파일 업로드 중 오류가 발생했습니다: {str(e)}"

    def _generate_file_hash(self, file_path):
        """파일 해시 생성"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def delete_file(self, file_path):
        """파일 삭제"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True, "파일이 삭제되었습니다."
            else:
                return False, "파일을 찾을 수 없습니다."
        except Exception as e:
            return False, f"파일 삭제 중 오류가 발생했습니다: {str(e)}"

    def get_file_info(self, file_path):
        """파일 정보 조회"""
        try:
            if not os.path.exists(file_path):
                return None

            stat = os.stat(file_path)
            return {
                'file_path': file_path,
                'file_size': stat.st_size,
                'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'is_file': os.path.isfile(file_path),
                'is_directory': os.path.isdir(file_path)
            }
        except Exception:
            return None

    def cleanup_temp_files(self, max_age_hours=24):
        """임시 파일 정리"""
        try:
            temp_folder = os.path.join(self.upload_folder, 'temp')
            if not os.path.exists(temp_folder):
                return

            current_time = datetime.now().timestamp()
            max_age_seconds = max_age_hours * 3600

            for filename in os.listdir(temp_folder):
                file_path = os.path.join(temp_folder, filename)
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getctime(file_path)
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                        print(f"임시 파일 삭제: {filename}")
        except Exception as e:
            print(f"임시 파일 정리 중 오류: {e}")

    def get_storage_info(self):
        """저장소 정보 조회"""
        try:
            total_size = 0
            file_count = 0

            for root, dirs, files in os.walk(self.upload_folder):
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.isfile(file_path):
                        total_size += os.path.getsize(file_path)
                        file_count += 1

            return {
                'total_size': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'file_count': file_count,
                'upload_folder': self.upload_folder
            }
        except Exception:
            return None

# 전역 파일 매니저 인스턴스
file_manager = FileManager()
