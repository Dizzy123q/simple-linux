from setuptools import setup, find_packages

setup(
    name="simple-linux",
    version="1.0.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "pywebview>=4.4.1",
        "PyQt6",
        "PyQt6-WebEngine",
    ],
    entry_points={
        "gui_scripts": [
            "simple-linux=simple_linux.main:main"
        ]
    },
    python_requires=">=3.10",)